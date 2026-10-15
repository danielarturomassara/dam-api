import {IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {describe, expect, it} from 'vitest';

// TYPE tests for the identity discriminated union: a variant rejects every other variant's
// fields at compile time. Validated by `npm run type-check`; each ts-expect-error line fails the
// type-check if the rejection it pins ever stops happening.

const baseIdentityPrimitives = {
  createdAt: new Date('2026-01-05T10:00:00.000Z'),
  disabledAt: null,
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  updatedAt: new Date('2026-01-05T10:00:00.000Z'),
  verifiedAt: null
};

describe('Identity union typing', (): void => {
  it('rejects a password identity carrying a verification code', (): void => {
    // @ts-expect-error the password variant excludes the phone variant's fields
    const invalidIdentity: IdentityPrimitives = {...baseIdentityPrimitives, code: '123456', hash: 'h', password: 'p', provider: IDENTITY_PROVIDERS.PASSWORD};

    expect(invalidIdentity.provider).toBe(IDENTITY_PROVIDERS.PASSWORD);
  });

  it('rejects a phone identity carrying an email', (): void => {
    // @ts-expect-error the phone variant excludes the oauth variants' fields
    const invalidIdentity: IdentityPrimitives = {...baseIdentityPrimitives, code: '123456', email: 'someone@example.com', provider: IDENTITY_PROVIDERS.PHONE};

    expect(invalidIdentity.provider).toBe(IDENTITY_PROVIDERS.PHONE);
  });

  it('rejects an oauth identity carrying a password hash', (): void => {
    // @ts-expect-error the google variant excludes the password variant's fields
    const invalidIdentity: IdentityPrimitives = {...baseIdentityPrimitives, email: 'someone@example.com', password: 'p', provider: IDENTITY_PROVIDERS.GOOGLE, providerUserId: 'g'};

    expect(invalidIdentity.provider).toBe(IDENTITY_PROVIDERS.GOOGLE);
  });

  it('keeps every union key readable on the union type', (): void => {
    const identity: IdentityPrimitives = {...baseIdentityPrimitives, code: '123456', provider: IDENTITY_PROVIDERS.PHONE};
    const email: string | undefined = identity.email;

    expect(email).toBeUndefined();
  });
});
