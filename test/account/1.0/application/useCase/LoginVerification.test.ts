import {Login} from '@account/application/useCase/Login.js';
import {RefreshAccessToken} from '@account/application/useCase/RefreshAccessToken.js';
import {LoginNotAllowed} from '@account/domain/error/LoginNotAllowed.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {buildLoginStrategyRegistry} from '../../double/buildLoginStrategyRegistry.js';
import {EncrypterCounting} from '../../double/EncrypterCounting.js';
import {LoginChallengeRepositoryInMemory} from '../../double/LoginChallengeRepositoryInMemory.js';
import {buildLoginChallenge, buildPasswordLoginAccount, buildPhoneLoginAccount, LOGIN_CODE, LOGIN_PASSWORD, LoginAccountState} from '../../double/loginFixtures.js';
import {RefreshTokenVerifierFake} from '../../double/RefreshTokenVerifierFake.js';
import {TokenIssuerFake} from '../../double/TokenIssuerFake.js';
import {AccountRepositoryRecording} from '../../double/verificationFixtures.js';

const PHONE = '+34600111222';

const phoneInput = (code: string = LOGIN_CODE): unknown => ({provider: 'phone', providerData: {code, phone: PHONE}});

let accountRepository: AccountRepositoryRecording;
let loginChallengeRepository: LoginChallengeRepositoryInMemory;
let tokenIssuer: TokenIssuerFake;
let login: Login;

beforeEach((): void => {
  accountRepository = new AccountRepositoryRecording();
  loginChallengeRepository = new LoginChallengeRepositoryInMemory();
  tokenIssuer = new TokenIssuerFake();
  login = new Login(buildLoginStrategyRegistry(accountRepository, loginChallengeRepository, new EncrypterCounting()), tokenIssuer, accountRepository);
});

describe('Login verifying an identity by its first proven credential', (): void => {
  it('verifies an unverified phone identity, persists the account and issues both tokens', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));

    const output = await login.run(phoneInput());

    expect(output.accessToken).toBe(`access:${account.id.toPrimitives()}`);
    expect(output.refreshToken).toBe(`refresh:${account.id.toPrimitives()}:phone`);
    expect(account.getIdentities()[0]?.isVerified()).toBe(true);
    expect(accountRepository.updatedAccountIdList).toStrictEqual([account.id.toPrimitives()]);
  });

  it('writes nothing to the accounts when the phone identity is already verified', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));
    await login.run(phoneInput());

    expect(accountRepository.updatedAccountIdList).toStrictEqual([]);
  });

  it('never verifies a phone identity whose code was not proven', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));

    await expect(login.run(phoneInput('000000'))).rejects.toThrow(new Unauthorized('Invalid credentials'));
    expect(account.getIdentities()[0]?.isVerified()).toBe(false);
    expect(accountRepository.updatedAccountIdList).toStrictEqual([]);
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });

  it.each<[LoginAccountState, string]>([
    [{isAccountDisabled: true, isIdentityVerified: false}, 'account disabled'],
    [{isIdentityDisabled: true, isIdentityVerified: false}, 'identity disabled']
  ])('verifies and persists in state %o, and still refuses the login with the reason "%s"', async (state: LoginAccountState, expectedReason: string): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE, state);

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));

    await expect(login.run(phoneInput())).rejects.toThrow(new LoginNotAllowed(expectedReason as LoginNotAllowed['reason']));
    expect(account.getIdentities()[0]?.isVerified()).toBe(true);
    expect(accountRepository.updatedAccountIdList).toStrictEqual([account.id.toPrimitives()]);
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });

  it('never verifies an identity of another mode: a proven password stays unverified and may not log in', async (): Promise<void> => {
    const account = buildPasswordLoginAccount('someone@example.com', {isIdentityVerified: false});

    await accountRepository.create(account);

    await expect(login.run({provider: 'password', providerData: {email: 'someone@example.com', password: LOGIN_PASSWORD}})).rejects.toThrow(new LoginNotAllowed('identity not verified'));
    expect(account.getIdentities()[0]?.isVerified()).toBe(false);
    expect(accountRepository.updatedAccountIdList).toStrictEqual([]);
  });

  it('issues no token when the verification cannot be persisted', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});

    await accountRepository.create(account);
    await loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));
    accountRepository.nextUpdateError = new Error('the database is unreachable');

    await expect(login.run(phoneInput())).rejects.toThrow('the database is unreachable');
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });
});

describe('RefreshAccessToken and verification', (): void => {
  it('never verifies an identity: a refresh token is not a login credential', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});
    const refreshAccessToken = new RefreshAccessToken(new RefreshTokenVerifierFake(), accountRepository, tokenIssuer);

    await accountRepository.create(account);

    await expect(refreshAccessToken.run({refreshToken: `refresh:${account.id.toPrimitives()}:phone`})).rejects.toThrow(new LoginNotAllowed('identity not verified'));
    expect(account.getIdentities()[0]?.isVerified()).toBe(false);
    expect(accountRepository.updatedAccountIdList).toStrictEqual([]);
  });
});
