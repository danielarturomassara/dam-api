import {IdentityProviderPassword} from '@account/domain/entity/IdentityProviderPassword.js';
import {VerificationNotProven} from '@account/domain/error/VerificationNotProven.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {describe, expect, it} from 'vitest';

import {VERIFICATION_HASH, VERIFICATION_LIFETIME_MILLISECONDS} from '../../double/verificationFixtures.js';

const CREATED_AT = new Date('2026-03-10T08:00:00.000Z');

const buildIdentity = (verifiedAt: Nullable<Date> = null): IdentityProviderPassword => {
  return IdentityProviderPassword.fromPrimitives({
    createdAt: CREATED_AT,
    disabledAt: null,
    hash: VERIFICATION_HASH,
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    password: 'hashed:correct-horse-battery',
    provider: IDENTITY_PROVIDERS.PASSWORD,
    updatedAt: CREATED_AT,
    verifiedAt
  });
};

const afterCreation = (milliseconds: number): Date => new Date(CREATED_AT.getTime() + milliseconds);

describe('IdentityProviderPassword verification', (): void => {
  it('becomes verified by its own hash inside the 24 hours', (): void => {
    const identity = buildIdentity();

    identity.verifyWithHash(VERIFICATION_HASH, afterCreation(60_000));

    expect(identity.isVerified()).toBe(true);
    expect(identity.toPrimitives().verifiedAt).toBeInstanceOf(Date);
  });

  it('is still proven one millisecond before the 24 hours end', (): void => {
    const identity = buildIdentity();

    identity.verifyWithHash(VERIFICATION_HASH, afterCreation(VERIFICATION_LIFETIME_MILLISECONDS - 1));

    expect(identity.isVerified()).toBe(true);
  });

  it.each([
    ['exactly 24 hours after its creation', VERIFICATION_LIFETIME_MILLISECONDS],
    ['long after its creation', VERIFICATION_LIFETIME_MILLISECONDS * 30]
  ])('is expired %s and stays unverified', (_caseName: string, elapsedMilliseconds: number): void => {
    const identity = buildIdentity();

    expect((): void => identity.verifyWithHash(VERIFICATION_HASH, afterCreation(elapsedMilliseconds))).toThrow(new VerificationNotProven());
    expect(identity.isVerified()).toBe(false);
  });

  it.each([
    ['another hash of the same length', '0b9b8d32-3c0e-4d0e-9a57-6d5c0a4f2b12'],
    ['a prefix of the hash', VERIFICATION_HASH.slice(0, 20)],
    ['the hash followed by more text', `${VERIFICATION_HASH}0`],
    ['the hash in another letter case', VERIFICATION_HASH.toUpperCase()],
    ['an empty hash', '']
  ])('is not proven by %s and stays unverified', (_caseName: string, hash: string): void => {
    const identity = buildIdentity();

    expect((): void => identity.verifyWithHash(hash, afterCreation(60_000))).toThrow(new VerificationNotProven());
    expect(identity.isVerified()).toBe(false);
  });

  it('is proven once: a verified identity is proven by no hash, and keeps its verification instant', (): void => {
    const verifiedAt = afterCreation(1_000);
    const identity = buildIdentity(verifiedAt);

    expect((): void => identity.verifyWithHash(VERIFICATION_HASH, afterCreation(60_000))).toThrow(new VerificationNotProven());
    expect(identity.toPrimitives().verifiedAt).toStrictEqual(verifiedAt);
  });

  it('refuses the second submission of the right hash', (): void => {
    const identity = buildIdentity();

    identity.verifyWithHash(VERIFICATION_HASH, afterCreation(60_000));

    expect((): void => identity.verifyWithHash(VERIFICATION_HASH, afterCreation(61_000))).toThrow(new VerificationNotProven());
  });
});
