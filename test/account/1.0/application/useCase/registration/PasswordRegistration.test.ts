import {PasswordRegistration} from '@account/application/useCase/registration/PasswordRegistration.js';
import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {describe, expect, it} from 'vitest';

import {AccountConfigFake} from '../../../double/AccountConfigFake.js';
import {AccountRepositoryInMemory} from '../../../double/AccountRepositoryInMemory.js';
import {EncrypterFake} from '../../../double/EncrypterFake.js';

// Pins spec/approved/account.spec.md §4.2 (field messages) and §4.3.

const validProviderData = {email: 'someone@example.com', password: 'correct-horse-battery'};

const buildPasswordRegistration = (
  accountRepository: AccountRepositoryInMemory = new AccountRepositoryInMemory(),
  encrypter: EncrypterFake = new EncrypterFake(),
  accountConfig: AccountConfigFake = new AccountConfigFake()
): PasswordRegistration => {
  return new PasswordRegistration(encrypter, accountRepository, accountConfig);
};

const fieldRejectionList: Array<[string, unknown, string]> = [
  ['a missing email', {password: 'correct-horse-battery'}, 'email is required for password provider'],
  ['a blank email', {email: '  ', password: 'correct-horse-battery'}, 'email is required for password provider'],
  ['a null email', {email: null, password: 'correct-horse-battery'}, 'email is required for password provider'],
  ['a numeric email', {email: 5, password: 'correct-horse-battery'}, 'email must be a string for password provider'],
  ['a missing password', {email: 'someone@example.com'}, 'password is required for password provider'],
  ['an object password', {email: 'someone@example.com', password: {}}, 'password must be a string for password provider'],
  ['a short password', {email: 'someone@example.com', password: 'short'}, 'Password must be at least 8 characters long'],
  ['a password over 72 bytes', {email: 'someone@example.com', password: 'a'.repeat(73)}, 'Password must be at most 72 bytes long'],
  ['a multi-byte password over 72 bytes', {email: 'someone@example.com', password: '🐎'.repeat(19)}, 'Password must be at most 72 bytes long']
];

describe('PasswordRegistration', (): void => {
  it.each(fieldRejectionList)('rejects %s', async (_caseName: string, providerData: unknown, expectedMessage: string): Promise<void> => {
    await expect(buildPasswordRegistration().register(providerData)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
  });

  it('rejects a malformed email through the Email value object', async (): Promise<void> => {
    await expect(buildPasswordRegistration().register({email: 'not-an-email', password: 'correct-horse-battery'})).rejects.toThrow(InvalidArgument);
  });

  it('accepts passwords of exactly 72 bytes', async (): Promise<void> => {
    await expect(buildPasswordRegistration().register({email: 'someone@example.com', password: 'a'.repeat(72)})).resolves.toBeDefined();
    await expect(buildPasswordRegistration().register({email: 'someone@example.com', password: '🐎'.repeat(18)})).resolves.toBeDefined();
  });

  it('lowercases the email and drops unknown fields before building the account', async (): Promise<void> => {
    const account = await buildPasswordRegistration().register({email: 'Someone@Example.COM', isAdmin: true, password: 'sunlight1'});
    const accountPrimitives = account.toPrimitives();

    expect(accountPrimitives.primaryEmail).toBe('someone@example.com');
    expect(accountPrimitives).not.toHaveProperty('isAdmin');
    expect(accountPrimitives.identities[0]).toMatchObject({password: `${EncrypterFake.HASH_PREFIX}sunlight1`, verifiedAt: null});
  });

  it('gives every password identity a fresh single-use verification hash and no email of its own', async (): Promise<void> => {
    const firstIdentity = (await buildPasswordRegistration().register(validProviderData)).toPrimitives().identities[0];
    const secondIdentity = (await buildPasswordRegistration().register(validProviderData)).toPrimitives().identities[0];

    expect(firstIdentity?.hash).toMatch(/^[0-9a-f-]{36}$/);
    expect(firstIdentity?.hash).not.toBe(secondIdentity?.hash);
    expect(firstIdentity).not.toHaveProperty('email');
  });

  it('enforces the configured composition rules', async (): Promise<void> => {
    const passwordRegistration = buildPasswordRegistration(new AccountRepositoryInMemory(), new EncrypterFake(), new AccountConfigFake({minimumDigitCount: 1}));

    await expect(passwordRegistration.register(validProviderData)).rejects.toThrow(new InvalidArgument({customMessage: 'Password must contain at least 1 digits'}));
  });

  it('reports a duplicate email as DuplicateContact after computing the hash', async (): Promise<void> => {
    const accountRepository = new AccountRepositoryInMemory();
    const encrypter = new EncrypterFake();
    const passwordRegistration = buildPasswordRegistration(accountRepository, encrypter);

    await accountRepository.create(await passwordRegistration.register(validProviderData));

    await expect(passwordRegistration.register(validProviderData)).rejects.toThrow(DuplicateContact);
    await expect(passwordRegistration.register(validProviderData)).rejects.toThrow('Conflict: email.');
    expect(encrypter.encryptCallCount).toBe(3);
    expect(accountRepository.accountList).toHaveLength(1);
  });
});
