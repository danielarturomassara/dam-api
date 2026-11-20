import {Login} from '@account/application/useCase/Login.js';
import {LoginNotAllowed} from '@account/domain/error/LoginNotAllowed.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountRepositoryInMemory} from '../../double/AccountRepositoryInMemory.js';
import {buildLoginStrategyRegistry} from '../../double/buildLoginStrategyRegistry.js';
import {EncrypterCounting} from '../../double/EncrypterCounting.js';
import {LoginChallengeRepositoryInMemory} from '../../double/LoginChallengeRepositoryInMemory.js';
import {buildLoginChallenge, buildPasswordLoginAccount, buildPhoneLoginAccount, LOGIN_CODE, LOGIN_PASSWORD, LoginAccountState} from '../../double/loginFixtures.js';
import {TokenIssuerFake} from '../../double/TokenIssuerFake.js';

let accountRepository: AccountRepositoryInMemory;
let loginChallengeRepository: LoginChallengeRepositoryInMemory;
let tokenIssuer: TokenIssuerFake;
let login: Login;

const passwordInput = (email: string, password: string = LOGIN_PASSWORD): unknown => ({provider: 'password', providerData: {email, password}});

beforeEach((): void => {
  accountRepository = new AccountRepositoryInMemory();
  loginChallengeRepository = new LoginChallengeRepositoryInMemory();
  tokenIssuer = new TokenIssuerFake();
  login = new Login(buildLoginStrategyRegistry(accountRepository, loginChallengeRepository, new EncrypterCounting()), tokenIssuer);
});

describe('Login', (): void => {
  it('answers one access token and one refresh token for a proven password credential', async (): Promise<void> => {
    const account = buildPasswordLoginAccount('someone@example.com');

    await accountRepository.create(account);

    await expect(login.run(passwordInput('someone@example.com'))).resolves.toStrictEqual({
      accessToken: `access:${account.id.toPrimitives()}`,
      expiresIn: 900,
      refreshExpiresIn: 2_592_000,
      refreshToken: `refresh:${account.id.toPrimitives()}:password`,
      tokenType: 'Bearer'
    });
  });

  it('issues the refresh token for the provider that was proven', async (): Promise<void> => {
    const account = buildPhoneLoginAccount('+34600111222');

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));

    const output = await login.run({provider: 'phone', providerData: {code: LOGIN_CODE, phone: '+34600111222'}});

    expect(output.refreshToken).toBe(`refresh:${account.id.toPrimitives()}:phone`);
  });

  it.each<[LoginAccountState, string]>([
    [{isAccountDisabled: true}, 'account disabled'],
    [{isIdentityDisabled: true}, 'identity disabled'],
    [{isIdentityVerified: false}, 'identity not verified']
  ])('refuses a proven credential in state %o with the reason "%s", issuing nothing', async (state: LoginAccountState, expectedReason: string): Promise<void> => {
    await accountRepository.create(buildPasswordLoginAccount('someone@example.com', state));

    await expect(login.run(passwordInput('someone@example.com'))).rejects.toThrow(new LoginNotAllowed(expectedReason as LoginNotAllowed['reason']));
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });

  it('reveals the state of an account only to a caller who proved the credential', async (): Promise<void> => {
    await accountRepository.create(buildPasswordLoginAccount('someone@example.com', {isAccountDisabled: true}));

    await expect(login.run(passwordInput('someone@example.com', 'wrong-horse-battery'))).rejects.toThrow(new Unauthorized('Invalid credentials'));
  });

  it('consumes a matched phone code even when the identity may not log in', async (): Promise<void> => {
    const account = buildPhoneLoginAccount('+34600111222', {isIdentityDisabled: true});

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));

    await expect(login.run({provider: 'phone', providerData: {code: LOGIN_CODE, phone: '+34600111222'}})).rejects.toThrow(new LoginNotAllowed('identity disabled'));
    expect(loginChallengeRepository.challengeList[0]?.consumedAt).toBeInstanceOf(Date);
  });

  it.each([
    ['apple', {code: 'c', id_token: 't', state: 's'}],
    ['google', {access_token: 'a', expires_in: 3600, id_token: 't', scope: 'openid', token_type: 'Bearer'}],
    ['meta', {authResponse: {accessToken: 'a', expiresIn: 3600, userID: 'u'}, status: 'connected'}]
  ])('rejects a well-formed %s login as not implemented', async (provider: string, providerData: unknown): Promise<void> => {
    await expect(login.run({provider, providerData})).rejects.toThrow(NotImplemented);
  });

  it.each([
    ['apple', {code: 'c', state: 's'}, 'id_token is required for apple provider'],
    ['google', {access_token: 'a'}, 'expires_in is required for google provider'],
    ['meta', {status: 'connected'}, 'authResponse is required for meta provider']
  ])('validates the %s shape before answering not implemented', async (provider: string, providerData: unknown, expectedMessage: string): Promise<void> => {
    await expect(login.run({provider, providerData})).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
  });

  it.each([
    [undefined, 'provider is required'],
    [{}, 'provider is required'],
    [{provider: '  '}, 'provider is required'],
    [{provider: 'carrier-pigeon', providerData: {}}, 'Unknown provider: carrier-pigeon'],
    [{provider: 7, providerData: {}}, 'Unknown provider: 7'],
    [{provider: 'toString', providerData: {}}, 'Unknown provider: toString']
  ])('rejects the envelope %o with "%s"', async (input: unknown, expectedMessage: string): Promise<void> => {
    await expect(login.run(input)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
  });
});
