import {IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {IdentityFactory} from '@account/domain/entity/IdentityFactory.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {IDENTITY_VERIFICATION_MODES} from '@account/domain/IdentityVerificationModes.js';
import {describe, expect, it} from 'vitest';

const baseIdentityPrimitives = {
  createdAt: new Date('2026-01-05T10:00:00.000Z'),
  disabledAt: null,
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  updatedAt: new Date('2026-01-05T10:00:00.000Z'),
  verifiedAt: null
};

const identityModeList: Array<[IDENTITY_PROVIDERS, IdentityPrimitives, IDENTITY_VERIFICATION_MODES]> = [
  [IDENTITY_PROVIDERS.APPLE, {...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.APPLE, providerUserId: 'apple-user-1'}, IDENTITY_VERIFICATION_MODES.ON_CREATION],
  [IDENTITY_PROVIDERS.GOOGLE, {...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.GOOGLE, providerUserId: 'google-user-1'}, IDENTITY_VERIFICATION_MODES.ON_CREATION],
  [IDENTITY_PROVIDERS.META, {...baseIdentityPrimitives, email: 'someone@example.com', provider: IDENTITY_PROVIDERS.META, providerUserId: 'meta-user-1'}, IDENTITY_VERIFICATION_MODES.ON_CREATION],
  [IDENTITY_PROVIDERS.PASSWORD, {...baseIdentityPrimitives, hash: 'verification-hash', password: 'hashed-password', provider: IDENTITY_PROVIDERS.PASSWORD}, IDENTITY_VERIFICATION_MODES.BY_LINK],
  [IDENTITY_PROVIDERS.PHONE, {...baseIdentityPrimitives, provider: IDENTITY_PROVIDERS.PHONE}, IDENTITY_VERIFICATION_MODES.BY_LOGIN]
];

describe('Identity verification mode', (): void => {
  it('names the three modes with their stored values', (): void => {
    expect(IDENTITY_VERIFICATION_MODES).toStrictEqual({BY_LINK: 'link', BY_LOGIN: 'login', ON_CREATION: 'creation'});
  });

  it.each(identityModeList)('the %s identity declares its own mode', (_provider: IDENTITY_PROVIDERS, identityPrimitives: IdentityPrimitives, expectedMode: IDENTITY_VERIFICATION_MODES): void => {
    expect(IdentityFactory.fromPrimitives(identityPrimitives).getVerificationMode()).toBe(expectedMode);
  });

  it('declares a mode for every provider', (): void => {
    expect(identityModeList.map(([provider]) => provider).sort()).toStrictEqual(Object.values(IDENTITY_PROVIDERS).sort());
  });
});
