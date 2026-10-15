import {Register} from '@account/application/useCase/Register.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {describe, expect, it} from 'vitest';

import {AccountRepositoryInMemory} from '../../double/AccountRepositoryInMemory.js';
import {buildRegistrationStrategyRegistry} from '../../double/buildRegistrationStrategyRegistry.js';
import {EncrypterFake} from '../../double/EncrypterFake.js';

// Pins spec/approved/account.spec.md §4.2 (envelope rules) and the account each provider creates.

const buildRegister = (accountRepository: AccountRepositoryInMemory = new AccountRepositoryInMemory()): Register => {
  return new Register(accountRepository, buildRegistrationStrategyRegistry(accountRepository));
};

const rejectedEnvelopeList: Array<[string, unknown, string]> = [
  ['a non-object body', 'text', 'provider is required'],
  ['a null body', null, 'provider is required'],
  ['a missing provider', {providerData: {}}, 'provider is required'],
  ['a blank provider', {provider: '  ', providerData: {}}, 'provider is required'],
  ['a numeric provider', {provider: 7, providerData: {}}, 'Unknown provider: 7'],
  ['an array provider', {provider: ['password'], providerData: {}}, 'Unknown provider: password'],
  ['an object provider', {provider: {toString: (): string => 'password'}, providerData: {}}, 'Unknown provider: password'],
  ['an unknown provider', {provider: 'carrier-pigeon', providerData: {}}, 'Unknown provider: carrier-pigeon'],
  ['a prototype member name', {provider: 'constructor', providerData: {}}, 'Unknown provider: constructor'],
  ['the __proto__ name', {provider: '__proto__', providerData: {}}, 'Unknown provider: __proto__'],
  ['a missing providerData', {provider: 'password'}, 'providerData is required for password provider'],
  ['an array providerData', {provider: 'password', providerData: ['x']}, 'providerData must be an object for password provider']
];

describe('Register', (): void => {
  it.each(rejectedEnvelopeList)('rejects %s persisting nothing', async (_caseName: string, input: unknown, expectedMessage: string): Promise<void> => {
    const accountRepository = new AccountRepositoryInMemory();
    const register = buildRegister(accountRepository);

    await expect(register.run(input)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
    expect(accountRepository.accountList).toHaveLength(0);
  });

  it('creates an enabled account with a single unverified password identity', async (): Promise<void> => {
    const accountRepository = new AccountRepositoryInMemory();
    const register = buildRegister(accountRepository);

    await register.run({provider: 'password', providerData: {email: 'Someone@Example.com', password: 'correct-horse-battery'}});

    const accountPrimitives = accountRepository.accountList[0]?.toPrimitives();

    expect(accountRepository.accountList).toHaveLength(1);
    expect(accountPrimitives).toMatchObject({disabledAt: null, primaryEmail: 'someone@example.com', primaryPhone: null});
    expect(accountPrimitives?.identities).toHaveLength(1);
    expect(accountPrimitives?.identities[0]).toMatchObject({
      disabledAt: null,
      password: `${EncrypterFake.HASH_PREFIX}correct-horse-battery`,
      provider: IDENTITY_PROVIDERS.PASSWORD,
      verifiedAt: null
    });
    expect(accountPrimitives?.identities[0]).not.toHaveProperty('email');
  });

  it('creates an enabled account with a single unverified phone identity', async (): Promise<void> => {
    const accountRepository = new AccountRepositoryInMemory();
    const register = buildRegister(accountRepository);

    await register.run({provider: 'phone', providerData: {phone: '+34 600 123 456'}});

    const accountPrimitives = accountRepository.accountList[0]?.toPrimitives();

    expect(accountPrimitives).toMatchObject({disabledAt: null, primaryEmail: null, primaryPhone: '+34600123456'});
    expect(accountPrimitives?.identities[0]).toMatchObject({disabledAt: null, provider: IDENTITY_PROVIDERS.PHONE, verifiedAt: null});
    expect(accountPrimitives?.identities[0]?.code).toMatch(/^\d{6}$/);
    expect(accountPrimitives?.identities[0]).not.toHaveProperty('phone');
  });
});
