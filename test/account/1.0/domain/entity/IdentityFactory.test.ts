import {IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {IdentityFactory} from '@account/domain/entity/IdentityFactory.js';
import {IdentityProviderApple} from '@account/domain/entity/IdentityProviderApple.js';
import {IdentityProviderGoogle} from '@account/domain/entity/IdentityProviderGoogle.js';
import {IdentityProviderMeta} from '@account/domain/entity/IdentityProviderMeta.js';
import {IdentityProviderPassword} from '@account/domain/entity/IdentityProviderPassword.js';
import {IdentityProviderPhone} from '@account/domain/entity/IdentityProviderPhone.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {describe, expect, it} from 'vitest';

// Pins spec/approved/account.spec.md §3.2: hydration restores the concrete variant for its provider.

const baseIdentityPrimitives = {
  createdAt: new Date('2026-01-05T10:00:00.000Z'),
  disabledAt: null,
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  updatedAt: new Date('2026-01-05T10:00:00.000Z'),
  verifiedAt: null
};

const identityPrimitivesList: Array<[IdentityPrimitives, unknown]> = [
  [{...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.APPLE, providerUserId: 'apple-user-1'}, IdentityProviderApple],
  [{...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.GOOGLE, providerUserId: 'google-user-1'}, IdentityProviderGoogle],
  [{...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.META, providerUserId: 'meta-user-1'}, IdentityProviderMeta],
  [{...baseIdentityPrimitives, hash: 'verification-hash', password: 'hashed-password', provider: IDENTITY_PROVIDERS.PASSWORD}, IdentityProviderPassword],
  [{...baseIdentityPrimitives, code: '123456', provider: IDENTITY_PROVIDERS.PHONE}, IdentityProviderPhone]
];

describe('IdentityFactory', (): void => {
  it.each(identityPrimitivesList)('round-trips %o through its concrete variant', (identityPrimitives: IdentityPrimitives, expectedClass: unknown): void => {
    const identity = IdentityFactory.fromPrimitives(identityPrimitives);

    expect(identity).toBeInstanceOf(expectedClass as new (...constructorArguments: Array<never>) => unknown);
    expect(identity.toPrimitives()).toStrictEqual(identityPrimitives);
  });

  it('rejects an unknown provider in stored data', (): void => {
    const storedPrimitives = {...baseIdentityPrimitives, provider: 'carrier-pigeon'} as unknown as IdentityPrimitives;

    expect((): unknown => IdentityFactory.fromPrimitives(storedPrimitives))
      .toThrow(new InvalidArgument({value: 'carrier-pigeon', valueObjectName: 'provider'}));
  });
});
