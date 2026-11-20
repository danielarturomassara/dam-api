import {AccountRepository} from '@account/domain/AccountRepository.js';
import {IdentityProviderPassword} from '@account/domain/entity/IdentityProviderPassword.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {expect, it} from 'vitest';

import {buildPhoneAccount} from '../double/accountFixtures.js';
import {buildPasswordVerificationAccount, VERIFICATION_HASH} from '../double/verificationFixtures.js';

export interface AccountVerificationPersistenceContractContext {
  buildRepository: () => Promise<AccountRepository>;
}

export const runAccountVerificationPersistenceContractTests = (context: AccountVerificationPersistenceContractContext): void => {
  it('keeps the verification of a password identity across update and a new lookup', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const email = Email.fromPrimitives('verified.later@example.com');

    await repository.create(buildPasswordVerificationAccount(email.toPrimitives()));

    const foundAccount = await repository.findByEmail(email);
    const identity = foundAccount?.getIdentity(IDENTITY_PROVIDERS.PASSWORD);

    expect(identity).toBeInstanceOf(IdentityProviderPassword);

    if (!foundAccount || !(identity instanceof IdentityProviderPassword)) {
      throw new Error('The stored account lost its password identity.');
    }

    identity.verifyWithHash(VERIFICATION_HASH, new Date());

    await repository.update(foundAccount);

    const storedIdentity = (await repository.findById(foundAccount.id))?.toPrimitives().identities[0];

    expect(storedIdentity?.verifiedAt).toBeInstanceOf(Date);
    expect(storedIdentity).toMatchObject({hash: VERIFICATION_HASH, provider: IDENTITY_PROVIDERS.PASSWORD});
  });

  it('keeps the verification of a phone identity recorded by a proven credential', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const phone = Phone.fromPrimitives('+34600123999');

    await repository.create(buildPhoneAccount(phone.toPrimitives()));

    const foundAccount = await repository.findByPhone(phone);
    const identity = foundAccount?.getIdentity(IDENTITY_PROVIDERS.PHONE);

    if (!foundAccount || !identity) {
      throw new Error('The stored account lost its phone identity.');
    }

    expect(foundAccount.recordProvenCredential(identity)).toBe(true);

    await repository.update(foundAccount);

    const storedIdentity = (await repository.findByPhone(phone))?.toPrimitives().identities[0];

    expect(storedIdentity?.verifiedAt).toBeInstanceOf(Date);
    expect(storedIdentity).not.toHaveProperty('code');
  });

  it('stores an unverified identity as unverified', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const email = Email.fromPrimitives('never.verified@example.com');

    await repository.create(buildPasswordVerificationAccount(email.toPrimitives()));

    expect((await repository.findByEmail(email))?.toPrimitives().identities[0]?.verifiedAt).toBeNull();
  });
};
