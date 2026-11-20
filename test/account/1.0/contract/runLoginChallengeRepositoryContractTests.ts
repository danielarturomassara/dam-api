import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {LoginChallengeRepository} from '@account/domain/LoginChallengeRepository.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {expect, it} from 'vitest';

import {buildLoginChallenge} from '../double/loginFixtures.js';

export interface LoginChallengeRepositoryContractContext {
  buildRepository: () => Promise<LoginChallengeRepository>;
}

const MAXIMUM_ATTEMPTS = 3;

const settle = async (operationList: Array<Promise<void>>): Promise<{fulfilledCount: number; rejectionList: Array<unknown>}> => {
  const outcomeList = await Promise.allSettled(operationList);

  return {
    fulfilledCount: outcomeList.filter((outcome) => outcome.status === 'fulfilled').length,
    rejectionList: outcomeList.flatMap((outcome) => outcome.status === 'rejected' ? [outcome.reason as unknown] : [])
  };
};

export const runLoginChallengeRepositoryContractTests = (context: LoginChallengeRepositoryContractContext): void => {
  it('finds a created challenge as the latest of its account and provider', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const challenge = buildLoginChallenge(accountId, new Date());

    await repository.create(challenge);

    const foundChallenge = await repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE);

    expect(foundChallenge?.toPrimitives()).toStrictEqual(challenge.toPrimitives());
  });

  it('returns null when the account has no challenge, or none of that provider', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();

    await repository.create(buildLoginChallenge(accountId, new Date()));

    await expect(repository.findLatestByAccount(Uuid.create(), IDENTITY_PROVIDERS.PHONE)).resolves.toBeNull();
    await expect(repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PASSWORD)).resolves.toBeNull();
  });

  it('returns the most recently created challenge, whatever the insertion order', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const now = new Date();
    const newest = buildLoginChallenge(accountId, now, {code: '333333', supersededChallengeId: Uuid.create()});

    await repository.create(buildLoginChallenge(accountId, now, {code: '111111', createdAt: new Date(now.getTime() - 120_000)}));
    await repository.create(newest);
    await repository.create(buildLoginChallenge(accountId, now, {code: '222222', createdAt: new Date(now.getTime() - 60_000), supersededChallengeId: Uuid.create()}));
    await repository.create(buildLoginChallenge(Uuid.create(), now, {code: '444444', createdAt: new Date(now.getTime() + 60_000)}));

    const foundChallenge = await repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE);

    expect(foundChallenge?.id.toPrimitives()).toBe(newest.id.toPrimitives());
  });

  it.each([
    ['supersede nothing', (): null | Uuid => null],
    ['supersede the same challenge', (): null | Uuid => Uuid.create()]
  ])('refuses with Conflict, without storing it, a second challenge of an account and provider when both %s', async (_caseName: string, buildSupersededId: () => null | Uuid): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const supersededChallengeId = buildSupersededId();
    const now = new Date();
    const first = buildLoginChallenge(accountId, now, {createdAt: new Date(now.getTime() - 1_000), supersededChallengeId});

    await repository.create(first);

    await expect(repository.create(buildLoginChallenge(accountId, now, {supersededChallengeId}))).rejects.toThrow(Conflict);
    expect((await repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE))?.id.toPrimitives()).toBe(first.id.toPrimitives());
  });

  it('accepts a challenge that supersedes the latest one, and challenges of other accounts that supersede the same', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const now = new Date();
    const first = buildLoginChallenge(accountId, now, {createdAt: new Date(now.getTime() - 1_000)});
    const second = buildLoginChallenge(accountId, now, {supersededChallengeId: first.id});

    await repository.create(first);
    await repository.create(second);
    await repository.create(buildLoginChallenge(Uuid.create(), now));
    await repository.create(buildLoginChallenge(Uuid.create(), now, {supersededChallengeId: first.id}));
    await repository.create(buildLoginChallenge(accountId, now, {provider: IDENTITY_PROVIDERS.PASSWORD}));
    await repository.create(buildLoginChallenge(accountId, now, {provider: IDENTITY_PROVIDERS.PASSWORD, supersededChallengeId: first.id}));

    expect((await repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE))?.toPrimitives()).toStrictEqual(second.toPrimitives());
  });

  it.each([
    ['nothing', (): null | Uuid => null],
    ['the same challenge', (): null | Uuid => Uuid.create()]
  ])('stores exactly one of several concurrent challenges that supersede %s', async (_caseName: string, buildSupersededId: () => null | Uuid): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const supersededChallengeId = buildSupersededId();

    const {fulfilledCount, rejectionList} = await settle(Array.from({length: 8}, () => repository.create(buildLoginChallenge(accountId, new Date(), {supersededChallengeId}))));

    expect(fulfilledCount).toBe(1);
    expect(rejectionList).toHaveLength(7);
    expect(rejectionList.every((rejection) => rejection instanceof Conflict)).toBe(true);
  });

  it('counts a claimed attempt', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const challenge = buildLoginChallenge(accountId, new Date());

    await repository.create(challenge);
    await repository.claimAttempt(challenge.id, MAXIMUM_ATTEMPTS);
    await repository.claimAttempt(challenge.id, MAXIMUM_ATTEMPTS);

    const foundChallenge = await repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE);

    expect(foundChallenge?.attemptCount).toBe(2);
    expect(foundChallenge?.consumedAt).toBeNull();
  });

  it('refuses an attempt beyond the maximum with Conflict, without counting it', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const challenge = buildLoginChallenge(accountId, new Date(), {attemptCount: MAXIMUM_ATTEMPTS});

    await repository.create(challenge);

    await expect(repository.claimAttempt(challenge.id, MAXIMUM_ATTEMPTS)).rejects.toThrow(Conflict);
    expect((await repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE))?.attemptCount).toBe(MAXIMUM_ATTEMPTS);
  });

  it('never grants concurrent submissions more attempts than the maximum in total', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const challenge = buildLoginChallenge(accountId, new Date());

    await repository.create(challenge);

    const {fulfilledCount, rejectionList} = await settle(Array.from({length: 12}, () => repository.claimAttempt(challenge.id, MAXIMUM_ATTEMPTS)));

    expect(fulfilledCount).toBe(MAXIMUM_ATTEMPTS);
    expect(rejectionList.every((rejection) => rejection instanceof Conflict)).toBe(true);
    expect((await repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE))?.attemptCount).toBe(MAXIMUM_ATTEMPTS);
  });

  it.each([
    ['an expired challenge', {createdAt: new Date(Date.now() - 301_000)}],
    ['a consumed challenge', {consumedAt: new Date()}]
  ])('refuses an attempt on %s with Conflict', async (_caseName: string, overrides: {consumedAt?: Date; createdAt?: Date}): Promise<void> => {
    const repository = await context.buildRepository();
    const challenge = buildLoginChallenge(Uuid.create(), new Date(), overrides);

    await repository.create(challenge);

    await expect(repository.claimAttempt(challenge.id, MAXIMUM_ATTEMPTS)).rejects.toThrow(Conflict);
  });

  it('refuses an attempt on a challenge that was never created with Conflict', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await expect(repository.claimAttempt(Uuid.create(), MAXIMUM_ATTEMPTS)).rejects.toThrow(Conflict);
  });

  it('consumes a challenge once and refuses a second consume with Conflict', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const challenge = buildLoginChallenge(accountId, new Date());

    await repository.create(challenge);
    await repository.consume(challenge.id);

    expect((await repository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE))?.isConsumed()).toBe(true);
    await expect(repository.consume(challenge.id)).rejects.toThrow(Conflict);
  });

  it('lets exactly one of several concurrent consumes take effect', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const challenge = buildLoginChallenge(Uuid.create(), new Date());

    await repository.create(challenge);

    const {fulfilledCount, rejectionList} = await settle(Array.from({length: 8}, () => repository.consume(challenge.id)));

    expect(fulfilledCount).toBe(1);
    expect(rejectionList.every((rejection) => rejection instanceof Conflict)).toBe(true);
  });

  it('refuses to consume a challenge that was never created with Conflict', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await expect(repository.consume(Uuid.create())).rejects.toThrow(Conflict);
  });
};
