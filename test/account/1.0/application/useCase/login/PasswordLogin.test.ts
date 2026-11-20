import {PasswordLogin} from '@account/application/useCase/login/PasswordLogin.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountRepositoryInMemory} from '../../../double/AccountRepositoryInMemory.js';
import {EncrypterCounting} from '../../../double/EncrypterCounting.js';
import {buildGoogleOnlyAccount, buildPasswordAccountWithGoogleEmail, buildPasswordLoginAccount, LOGIN_PASSWORD} from '../../../double/loginFixtures.js';

const INVALID_CREDENTIALS = new Unauthorized('Invalid credentials');

let accountRepository: AccountRepositoryInMemory;
let encrypter: EncrypterCounting;
let passwordLogin: PasswordLogin;

beforeEach((): void => {
  accountRepository = new AccountRepositoryInMemory();
  encrypter = new EncrypterCounting();
  passwordLogin = new PasswordLogin(encrypter, accountRepository);
});

describe('PasswordLogin', (): void => {
  it('proves the credential of the primary email and its password', async (): Promise<void> => {
    const account = buildPasswordLoginAccount('someone@example.com');

    await accountRepository.create(account);

    const authenticated = await passwordLogin.authenticate({email: 'someone@example.com', password: LOGIN_PASSWORD});

    expect(authenticated.account.id.toPrimitives()).toBe(account.id.toPrimitives());
    expect(authenticated.identity.provider).toBe(IDENTITY_PROVIDERS.PASSWORD);
  });

  it('lowercases the email before looking the account up', async (): Promise<void> => {
    await accountRepository.create(buildPasswordLoginAccount('someone@example.com'));

    await expect(passwordLogin.authenticate({email: ' Someone@Example.COM ', password: LOGIN_PASSWORD})).resolves.toBeDefined();
  });

  it('proves a disabled or unverified identity too: who may log in is decided after the proof', async (): Promise<void> => {
    await accountRepository.create(buildPasswordLoginAccount('someone@example.com', {isAccountDisabled: true, isIdentityVerified: false}));

    await expect(passwordLogin.authenticate({email: 'someone@example.com', password: LOGIN_PASSWORD})).resolves.toBeDefined();
  });

  it('applies no length or composition rule to the password', async (): Promise<void> => {
    await accountRepository.create(buildPasswordLoginAccount('someone@example.com'));

    await expect(passwordLogin.authenticate({email: 'someone@example.com', password: 'x'})).rejects.toThrow(INVALID_CREDENTIALS);
  });

  it.each([
    ['an unknown email', 'nobody@example.com', LOGIN_PASSWORD],
    ['a wrong password', 'someone@example.com', 'wrong-horse-battery'],
    ['an email held only as an oauth identity\'s asserted email', 'asserted@gmail.com', LOGIN_PASSWORD],
    ['an account without a password identity', 'google.only@gmail.com', LOGIN_PASSWORD],
    ['a password longer than 72 bytes', 'long@example.com', `${LOGIN_PASSWORD}${'x'.repeat(72)}`],
    ['a password longer than 72 bytes in multi-byte characters', 'long@example.com', 'ñ'.repeat(37)]
  ])('answers the one Invalid credentials message for %s, after exactly one bcrypt computation', async (_caseName: string, email: string, password: string): Promise<void> => {
    await accountRepository.create(buildPasswordLoginAccount('someone@example.com'));
    await accountRepository.create(buildPasswordAccountWithGoogleEmail('primary@example.com', 'asserted@gmail.com'));
    await accountRepository.create(buildGoogleOnlyAccount('google.only@gmail.com'));
    await accountRepository.create(buildPasswordLoginAccount('long@example.com'));

    await expect(passwordLogin.authenticate({email, password})).rejects.toThrow(INVALID_CREDENTIALS);
    expect(encrypter.getComputationCount()).toBe(1);
  });

  it('never proves an over-long password, even when its first 72 bytes are the stored password', async (): Promise<void> => {
    const overLongPassword = 'p'.repeat(73);

    await accountRepository.create(buildPasswordLoginAccount('long@example.com', {}, overLongPassword));

    await expect(passwordLogin.authenticate({email: 'long@example.com', password: overLongPassword})).rejects.toThrow(INVALID_CREDENTIALS);
    expect(encrypter.compareCallCount).toBe(0);
  });

  it.each([
    [{password: LOGIN_PASSWORD}, 'email is required for password provider'],
    [{email: 'someone@example.com'}, 'password is required for password provider'],
    [{email: 7, password: LOGIN_PASSWORD}, 'email must be a string for password provider'],
    [{email: 'someone@example.com', password: 7}, 'password must be a string for password provider'],
    [{email: 'not-an-email', password: LOGIN_PASSWORD}, '<Email> does not allow the value <not-an-email>'],
    [null, 'providerData is required for password provider']
  ])('rejects %o with "%s" before any lookup or hash', async (rawProviderData: unknown, expectedMessage: string): Promise<void> => {
    await expect(passwordLogin.authenticate(rawProviderData)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
    expect(encrypter.getComputationCount()).toBe(0);
  });
});
