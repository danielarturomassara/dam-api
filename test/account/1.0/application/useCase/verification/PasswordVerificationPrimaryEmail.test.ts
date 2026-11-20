import {PasswordVerification} from '@account/application/useCase/verification/PasswordVerification.js';
import {Account} from '@account/domain/entity/Account.js';
import {VerificationNotProven} from '@account/domain/error/VerificationNotProven.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountRepositoryRecording, VERIFICATION_HASH} from '../../../double/verificationFixtures.js';

const PRIMARY_EMAIL = 'primary@example.com';

const OAUTH_EMAIL = 'asserted@example.com';

const buildAccountWithUnverifiedPasswordAndGoogleEmail = (): Account => {
  const now = new Date();
  const baseIdentity = {createdAt: now, disabledAt: null, updatedAt: now};

  return Account.fromPrimitives({
    createdAt: now,
    disabledAt: null,
    id: Uuid.create().toPrimitives(),
    identities: [
      {...baseIdentity, hash: VERIFICATION_HASH, id: Uuid.create().toPrimitives(), password: 'hashed:correct-horse-battery', provider: IDENTITY_PROVIDERS.PASSWORD, verifiedAt: null},
      {...baseIdentity, email: OAUTH_EMAIL, id: Uuid.create().toPrimitives(), provider: IDENTITY_PROVIDERS.GOOGLE, providerUserId: 'google-user-1', verifiedAt: now}
    ],
    primaryEmail: PRIMARY_EMAIL,
    primaryPhone: null,
    updatedAt: now
  });
};

let accountRepository: AccountRepositoryRecording;
let passwordVerification: PasswordVerification;
let account: Account;

beforeEach(async (): Promise<void> => {
  accountRepository = new AccountRepositoryRecording();
  passwordVerification = new PasswordVerification(accountRepository);
  account = buildAccountWithUnverifiedPasswordAndGoogleEmail();

  await accountRepository.create(account);
});

describe('PasswordVerification and the primary email', (): void => {
  it('is not proven through an email the account holds only as the asserted email of an oauth identity, even with the right hash', async (): Promise<void> => {
    await expect(passwordVerification.verify({email: OAUTH_EMAIL, hash: VERIFICATION_HASH})).rejects.toThrow(new VerificationNotProven());

    expect(accountRepository.findByEmailList).toStrictEqual([OAUTH_EMAIL]);
    expect(account.getIdentity(IDENTITY_PROVIDERS.PASSWORD)?.isVerified()).toBe(false);
  });

  it('is proven for the same account through its primary email', async (): Promise<void> => {
    await passwordVerification.verify({email: PRIMARY_EMAIL, hash: VERIFICATION_HASH});

    expect(account.getIdentity(IDENTITY_PROVIDERS.PASSWORD)?.isVerified()).toBe(true);
  });
});
