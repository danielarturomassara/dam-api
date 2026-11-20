import {PasswordVerification} from '@account/application/useCase/verification/PasswordVerification.js';
import {VerificationNotProven} from '@account/domain/error/VerificationNotProven.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {buildGoogleOnlyAccount, buildPasswordAccountWithGoogleEmail} from '../../../double/loginFixtures.js';
import {AccountRepositoryRecording, buildPasswordVerificationAccount, VERIFICATION_HASH, VERIFICATION_LIFETIME_MILLISECONDS, VerificationAccountState} from '../../../double/verificationFixtures.js';

const EMAIL = 'someone@example.com';

let accountRepository: AccountRepositoryRecording;
let passwordVerification: PasswordVerification;

beforeEach((): void => {
  accountRepository = new AccountRepositoryRecording();
  passwordVerification = new PasswordVerification(accountRepository);
});

describe('PasswordVerification', (): void => {
  it('resolves the account with its password identity verified', async (): Promise<void> => {
    const account = buildPasswordVerificationAccount(EMAIL);

    await accountRepository.create(account);

    const verifiedAccount = await passwordVerification.verify({email: EMAIL, hash: VERIFICATION_HASH});

    expect(verifiedAccount.id.toPrimitives()).toBe(account.id.toPrimitives());
    expect(verifiedAccount.toPrimitives().identities[0]?.verifiedAt).toBeInstanceOf(Date);
  });

  it('lowercases the email before looking the account up', async (): Promise<void> => {
    await accountRepository.create(buildPasswordVerificationAccount(EMAIL));

    await expect(passwordVerification.verify({email: ' Someone@Example.COM ', hash: VERIFICATION_HASH})).resolves.toBeDefined();
    expect(accountRepository.findByEmailList).toStrictEqual([EMAIL]);
  });

  it.each<[string, VerificationAccountState]>([
    ['the account is disabled', {isAccountDisabled: true}],
    ['the identity is disabled', {isIdentityDisabled: true}]
  ])('verifies whether or not %s', async (_caseName: string, state: VerificationAccountState): Promise<void> => {
    await accountRepository.create(buildPasswordVerificationAccount(EMAIL, state));

    const verifiedAccount = await passwordVerification.verify({email: EMAIL, hash: VERIFICATION_HASH});

    expect(verifiedAccount.getIdentities()[0]?.isVerified()).toBe(true);
  });

  it.each([
    ['a missing providerData', undefined, 'providerData is required for password provider'],
    ['a missing email', {hash: VERIFICATION_HASH}, 'email is required for password provider'],
    ['a blank email', {email: ' ', hash: VERIFICATION_HASH}, 'email is required for password provider'],
    ['a numeric email', {email: 7, hash: VERIFICATION_HASH}, 'email must be a string for password provider'],
    ['a missing hash', {email: EMAIL}, 'hash is required for password provider'],
    ['a blank hash', {email: EMAIL, hash: ''}, 'hash is required for password provider'],
    ['a numeric hash', {email: EMAIL, hash: 42}, 'hash must be a string for password provider'],
    ['a malformed email', {email: 'not-an-email', hash: VERIFICATION_HASH}, '<Email> does not allow the value <not-an-email>']
  ])('rejects %s and looks up no account', async (_caseName: string, providerData: unknown, expectedMessage: string): Promise<void> => {
    await expect(passwordVerification.verify(providerData)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
    expect(accountRepository.findByEmailList).toStrictEqual([]);
  });

  it.each<[string, () => Promise<void>, string]>([
    ['an unknown email', async (): Promise<void> => undefined, VERIFICATION_HASH],
    ['an email held only as the asserted email of an oauth identity', async (): Promise<void> => accountRepository.create(buildPasswordAccountWithGoogleEmail('primary@example.com', EMAIL)), VERIFICATION_HASH],
    ['an account without a password identity', async (): Promise<void> => accountRepository.create(buildGoogleOnlyAccount(EMAIL)), VERIFICATION_HASH],
    ['an identity already verified', async (): Promise<void> => accountRepository.create(buildPasswordVerificationAccount(EMAIL, {isIdentityVerified: true})), VERIFICATION_HASH],
    [
      'an identity older than 24 hours',
      async (): Promise<void> => accountRepository.create(buildPasswordVerificationAccount(EMAIL, {identityCreatedAt: new Date(Date.now() - VERIFICATION_LIFETIME_MILLISECONDS)})),
      VERIFICATION_HASH
    ],
    ['a wrong hash', async (): Promise<void> => accountRepository.create(buildPasswordVerificationAccount(EMAIL)), '0b9b8d32-3c0e-4d0e-9a57-6d5c0a4f2b12']
  ])('answers the one message for %s', async (_caseName: string, arrange: () => Promise<void>, hash: string): Promise<void> => {
    await arrange();

    const rejection: unknown = await passwordVerification.verify({email: EMAIL, hash}).catch((error: unknown): unknown => error);

    expect(rejection).toBeInstanceOf(VerificationNotProven);
    expect(rejection).toMatchObject({message: 'Invalid or expired verification'});
  });

  it('leaves the identity unverified after a wrong hash', async (): Promise<void> => {
    const account = buildPasswordVerificationAccount(EMAIL);

    await accountRepository.create(account);
    await expect(passwordVerification.verify({email: EMAIL, hash: 'wrong'})).rejects.toThrow(VerificationNotProven);

    expect(account.getIdentities()[0]?.isVerified()).toBe(false);
  });
});
