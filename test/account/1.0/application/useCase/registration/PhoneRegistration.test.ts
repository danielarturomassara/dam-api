import {PhoneRegistration} from '@account/application/useCase/registration/PhoneRegistration.js';
import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {describe, expect, it} from 'vitest';

import {AccountConfigFake} from '../../../double/AccountConfigFake.js';
import {AccountRepositoryInMemory} from '../../../double/AccountRepositoryInMemory.js';

// Pins spec/approved/account.spec.md §4.2 (phone normalization) and §4.4.

const buildPhoneRegistration = (
  accountRepository: AccountRepositoryInMemory = new AccountRepositoryInMemory(),
  accountConfig: AccountConfigFake = new AccountConfigFake()
): PhoneRegistration => {
  return new PhoneRegistration(accountRepository, accountConfig);
};

describe('PhoneRegistration', (): void => {
  it.each([
    ['a missing phone', {}, 'phone is required for phone provider'],
    ['a blank phone', {phone: ''}, 'phone is required for phone provider'],
    ['a numeric phone', {phone: 34600123456}, 'phone must be a string for phone provider']
  ])('rejects %s', async (_caseName: string, providerData: unknown, expectedMessage: string): Promise<void> => {
    await expect(buildPhoneRegistration().register(providerData)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
  });

  it.each([
    ['+34 600 123 456', '+34600123456'],
    ['0034 (600) 123-456', '+34600123456'],
    [' +34600123456 ', '+34600123456']
  ])('normalizes %s to %s', async (phone: string, expectedPhone: string): Promise<void> => {
    const account = await buildPhoneRegistration().register({phone});

    expect(account.toPrimitives().primaryPhone).toBe(expectedPhone);
  });

  it.each(['600123456', '34600123456', 'not a phone'])('rejects %s instead of guessing a country code', async (phone: string): Promise<void> => {
    await expect(buildPhoneRegistration().register({phone})).rejects.toThrow(InvalidArgument);
  });

  it('creates an unverified phone identity holding a code of the configured length and no phone of its own', async (): Promise<void> => {
    const account = await buildPhoneRegistration(new AccountRepositoryInMemory(), new AccountConfigFake({}, 4)).register({phone: '+34600123456'});
    const identity = account.toPrimitives().identities[0];

    expect(identity).toMatchObject({disabledAt: null, verifiedAt: null});
    expect(identity?.code).toMatch(/^\d{4}$/);
    expect(identity).not.toHaveProperty('phone');
    expect(account.toPrimitives().primaryEmail).toBeNull();
  });

  it('reports a duplicate phone as DuplicateContact', async (): Promise<void> => {
    const accountRepository = new AccountRepositoryInMemory();
    const phoneRegistration = buildPhoneRegistration(accountRepository);

    await accountRepository.create(await phoneRegistration.register({phone: '+34600123456'}));

    await expect(phoneRegistration.register({phone: '+34 600 123 456'})).rejects.toThrow(DuplicateContact);
    await expect(phoneRegistration.register({phone: '+34 600 123 456'})).rejects.toThrow('Conflict: phone.');
  });
});
