import {PasswordVerification} from '@account/application/useCase/verification/PasswordVerification.js';
import {VerifyIdentity} from '@account/application/useCase/VerifyIdentity.js';
import {VerificationNotProven} from '@account/domain/error/VerificationNotProven.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountRepositoryRecording, buildPasswordVerificationAccount, VERIFICATION_HASH} from '../../double/verificationFixtures.js';

const EMAIL = 'someone@example.com';

const passwordInput = (hash: string = VERIFICATION_HASH, email: string = EMAIL): unknown => ({provider: 'password', providerData: {email, hash}});

let accountRepository: AccountRepositoryRecording;
let verifyIdentity: VerifyIdentity;

beforeEach((): void => {
  accountRepository = new AccountRepositoryRecording();
  verifyIdentity = new VerifyIdentity(accountRepository, {[IDENTITY_PROVIDERS.PASSWORD]: new PasswordVerification(accountRepository)});
});

describe('VerifyIdentity', (): void => {
  it('verifies the password identity and persists the account', async (): Promise<void> => {
    const account = buildPasswordVerificationAccount(EMAIL);

    await accountRepository.create(account);
    await verifyIdentity.run(passwordInput());

    expect(account.getIdentities()[0]?.isVerified()).toBe(true);
    expect(accountRepository.updatedAccountIdList).toStrictEqual([account.id.toPrimitives()]);
  });

  it('verifies once: the second submission of the right hash is not proven and persists nothing more', async (): Promise<void> => {
    const account = buildPasswordVerificationAccount(EMAIL);

    await accountRepository.create(account);
    await verifyIdentity.run(passwordInput());

    await expect(verifyIdentity.run(passwordInput())).rejects.toThrow(new VerificationNotProven());
    expect(accountRepository.updatedAccountIdList).toHaveLength(1);
  });

  it('persists nothing when the verification is not proven', async (): Promise<void> => {
    await accountRepository.create(buildPasswordVerificationAccount(EMAIL));

    await expect(verifyIdentity.run(passwordInput('wrong'))).rejects.toThrow(new VerificationNotProven());
    expect(accountRepository.updatedAccountIdList).toStrictEqual([]);
  });

  it.each([
    ['a missing body', undefined, 'provider is required'],
    ['a missing provider', {providerData: {}}, 'provider is required'],
    ['a blank provider', {provider: ' '}, 'provider is required'],
    ['a non-string provider', {provider: 7}, 'Unknown provider: 7'],
    ['an unknown provider', {provider: 'carrier-pigeon', providerData: {}}, 'Unknown provider: carrier-pigeon'],
    ['an inherited object key as provider', {provider: 'toString', providerData: {}}, 'Unknown provider: toString'],
    ['a missing field', {provider: 'password', providerData: {email: EMAIL}}, 'hash is required for password provider']
  ])('rejects %s', async (_caseName: string, input: unknown, expectedMessage: string): Promise<void> => {
    await expect(verifyIdentity.run(input)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
    expect(accountRepository.findByEmailList).toStrictEqual([]);
  });

  it.each([IDENTITY_PROVIDERS.APPLE, IDENTITY_PROVIDERS.GOOGLE, IDENTITY_PROVIDERS.META, IDENTITY_PROVIDERS.PHONE])('rejects the %s provider, which has no verification step', async (provider: IDENTITY_PROVIDERS): Promise<void> => {
    await expect(verifyIdentity.run({provider, providerData: {email: EMAIL, hash: VERIFICATION_HASH}}))
      .rejects.toThrow(new InvalidArgument({customMessage: `${provider} provider has no verification step`}));
    expect(accountRepository.findByEmailList).toStrictEqual([]);
  });

  it('surfaces a persistence failure', async (): Promise<void> => {
    await accountRepository.create(buildPasswordVerificationAccount(EMAIL));
    accountRepository.nextUpdateError = new Error('the database is unreachable');

    await expect(verifyIdentity.run(passwordInput())).rejects.toThrow('the database is unreachable');
  });
});
