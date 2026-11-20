import {LoginChallenge} from '@account/domain/entity/LoginChallenge.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {describe, expect, it} from 'vitest';

import {buildLoginChallenge} from '../../double/loginFixtures.js';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const MAXIMUM_ATTEMPTS = 5;

const secondsAfterNow = (seconds: number): Date => new Date(NOW.getTime() + seconds * 1000);

describe('LoginChallenge', (): void => {
  it('is created not consumed, with no attempts, expiring exactly its lifetime after its own creation instant', (): void => {
    const accountId = Uuid.create();
    const challenge = LoginChallenge.create({
      accountId: accountId.toPrimitives(),
      codeHash: 'hashed:481930',
      lifetimeSeconds: 300,
      provider: IDENTITY_PROVIDERS.PHONE,
      supersededChallenge: null
    });

    expect(challenge.toPrimitives()).toStrictEqual({
      accountId: accountId.toPrimitives(),
      attemptCount: 0,
      codeHash: 'hashed:481930',
      consumedAt: null,
      createdAt: challenge.createdAt,
      expiresAt: new Date(challenge.createdAt.getTime() + 300_000),
      id: challenge.id.toPrimitives(),
      provider: IDENTITY_PROVIDERS.PHONE,
      supersededChallengeId: null,
      updatedAt: challenge.updatedAt
    });
    expect(challenge.isConsumed()).toBe(false);
  });

  it('records the challenge it supersedes', (): void => {
    const supersededChallenge = buildLoginChallenge(Uuid.create(), new Date(Date.now() - 120_000));
    const challenge = LoginChallenge.create({
      accountId: supersededChallenge.accountId.toPrimitives(),
      codeHash: 'hashed:481930',
      lifetimeSeconds: 300,
      provider: IDENTITY_PROVIDERS.PHONE,
      supersededChallenge
    });

    expect(challenge.supersededChallengeId?.toPrimitives()).toBe(supersededChallenge.id.toPrimitives());
    expect(challenge.toPrimitives().supersededChallengeId).toBe(supersededChallenge.id.toPrimitives());
    expect(challenge.createdAt.getTime()).toBeGreaterThan(supersededChallenge.createdAt.getTime());
  });

  it('is created after the challenge it supersedes even when that one is stamped ahead of this clock', (): void => {
    const supersededChallenge = buildLoginChallenge(Uuid.create(), new Date(Date.now() + 20_000));
    const challenge = LoginChallenge.create({
      accountId: supersededChallenge.accountId.toPrimitives(),
      codeHash: 'hashed:481930',
      lifetimeSeconds: 300,
      provider: IDENTITY_PROVIDERS.PHONE,
      supersededChallenge
    });

    expect(challenge.createdAt.getTime()).toBe(supersededChallenge.createdAt.getTime() + 1);
    expect(challenge.updatedAt).toStrictEqual(challenge.createdAt);
    expect(challenge.expiresAt.getTime()).toBe(challenge.createdAt.getTime() + 300_000);
  });

  it('rejects a stored superseded challenge id that is not a UUID', (): void => {
    const primitives = buildLoginChallenge(Uuid.create(), NOW).toPrimitives();

    expect((): unknown => LoginChallenge.fromPrimitives({...primitives, supersededChallengeId: 'not-a-uuid'})).toThrow(InvalidArgument);
  });

  it.each([
    ['superseding nothing', null],
    ['superseding a challenge', Uuid.create()]
  ])('round-trips its primitives when %s', (_caseName: string, supersededChallengeId: null | Uuid): void => {
    const primitives = buildLoginChallenge(Uuid.create(), NOW, {attemptCount: 2, consumedAt: secondsAfterNow(10), supersededChallengeId}).toPrimitives();

    expect(LoginChallenge.fromPrimitives(primitives).toPrimitives()).toStrictEqual(primitives);
  });

  it('is active while not consumed, not expired and below the maximum attempts', (): void => {
    expect(buildLoginChallenge(Uuid.create(), NOW, {attemptCount: MAXIMUM_ATTEMPTS - 1}).isActive(secondsAfterNow(299), MAXIMUM_ATTEMPTS)).toBe(true);
  });

  it('is not active once consumed', (): void => {
    const challenge = buildLoginChallenge(Uuid.create(), NOW, {consumedAt: secondsAfterNow(5)});

    expect(challenge.isConsumed()).toBe(true);
    expect(challenge.isActive(secondsAfterNow(10), MAXIMUM_ATTEMPTS)).toBe(false);
  });

  it('is not active from its expiry instant on', (): void => {
    const challenge = buildLoginChallenge(Uuid.create(), NOW);

    expect(challenge.isActive(secondsAfterNow(300), MAXIMUM_ATTEMPTS)).toBe(false);
    expect(challenge.isActive(secondsAfterNow(301), MAXIMUM_ATTEMPTS)).toBe(false);
  });

  it('is not active once its attempts reach the maximum', (): void => {
    expect(buildLoginChallenge(Uuid.create(), NOW, {attemptCount: MAXIMUM_ATTEMPTS}).isActive(secondsAfterNow(1), MAXIMUM_ATTEMPTS)).toBe(false);
  });

  it('tells whether it was created within a number of seconds', (): void => {
    const challenge = buildLoginChallenge(Uuid.create(), NOW);

    expect(challenge.wasCreatedWithin(60, secondsAfterNow(59))).toBe(true);
    expect(challenge.wasCreatedWithin(60, secondsAfterNow(60))).toBe(false);
    expect(challenge.wasCreatedWithin(0, NOW)).toBe(false);
  });

  it.each([-1, 1.5])('rejects the attempt count %s', (attemptCount: number): void => {
    expect((): unknown => buildLoginChallenge(Uuid.create(), NOW, {attemptCount})).toThrow(new InvalidArgument({customMessage: 'attemptCount must be a non-negative integer'}));
  });
});
