import {TokenRevocationRepository} from '@account/domain/TokenRevocationRepository.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {expect, it} from 'vitest';

export interface TokenRevocationRepositoryContractContext {
  buildRepository: () => Promise<TokenRevocationRepository>;
}

const CUTOFF = new Date('2026-03-01T10:00:00.000Z');

const LATER_EXPIRY = new Date('2026-03-31T10:00:00.000Z');

const secondsFromCutoff = (seconds: number): Date => new Date(CUTOFF.getTime() + seconds * 1000);

export const runTokenRevocationRepositoryContractTests = (context: TokenRevocationRepositoryContractContext): void => {
  it('answers that a token nobody revoked is not revoked', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await expect(repository.isRevoked({accountId: Uuid.create(), issuedAt: CUTOFF, tokenId: Uuid.create()})).resolves.toBe(false);
  });

  it('revokes exactly the token whose id was revoked', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const tokenId = Uuid.create();

    await repository.revokeToken(tokenId, LATER_EXPIRY);

    await expect(repository.isRevoked({accountId, issuedAt: CUTOFF, tokenId})).resolves.toBe(true);
    await expect(repository.isRevoked({accountId, issuedAt: CUTOFF, tokenId: Uuid.create()})).resolves.toBe(false);
  });

  it('revokes a token by its id whatever account presents it', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const tokenId = Uuid.create();

    await repository.revokeToken(tokenId, LATER_EXPIRY);

    await expect(repository.isRevoked({accountId: Uuid.create(), issuedAt: secondsFromCutoff(3600), tokenId})).resolves.toBe(true);
  });

  it('takes no effect and does not throw when a token is revoked twice', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const tokenId = Uuid.create();

    await repository.revokeToken(tokenId, LATER_EXPIRY);

    await expect(repository.revokeToken(tokenId, secondsFromCutoff(60))).resolves.toBeUndefined();
    await expect(repository.isRevoked({accountId: Uuid.create(), issuedAt: CUTOFF, tokenId})).resolves.toBe(true);
  });

  it('takes no effect and does not throw when a token is revoked several times at once', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const tokenId = Uuid.create();
    const outcomeList = await Promise.allSettled(Array.from({length: 8}, async (): Promise<void> => repository.revokeToken(tokenId, LATER_EXPIRY)));

    expect(outcomeList.map((outcome) => outcome.status)).toStrictEqual(Array.from({length: 8}, (): string => 'fulfilled'));
    await expect(repository.isRevoked({accountId: Uuid.create(), issuedAt: CUTOFF, tokenId})).resolves.toBe(true);
  });

  it.each([
    ['long before the cutoff', -86_400, true],
    ['one second before the cutoff', -1, true],
    ['at the cutoff', 0, true],
    ['one second after the cutoff', 1, false],
    ['long after the cutoff', 86_400, false]
  ])('revokes every token of the account issued at or before the cutoff — a token issued %s', async (_caseName: string, issuedSecondsFromCutoff: number, expectedRevoked: boolean): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();

    await repository.revokeTokensOfAccount(accountId, CUTOFF, LATER_EXPIRY);

    await expect(repository.isRevoked({accountId, issuedAt: secondsFromCutoff(issuedSecondsFromCutoff), tokenId: Uuid.create()})).resolves.toBe(expectedRevoked);
  });

  it('leaves the tokens of every other account alone', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await repository.revokeTokensOfAccount(Uuid.create(), CUTOFF, LATER_EXPIRY);

    await expect(repository.isRevoked({accountId: Uuid.create(), issuedAt: secondsFromCutoff(-60), tokenId: Uuid.create()})).resolves.toBe(false);
  });

  it('still revokes by id a token issued after the cutoff of its account', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const tokenId = Uuid.create();

    await repository.revokeTokensOfAccount(accountId, CUTOFF, LATER_EXPIRY);
    await repository.revokeToken(tokenId, LATER_EXPIRY);

    await expect(repository.isRevoked({accountId, issuedAt: secondsFromCutoff(60), tokenId})).resolves.toBe(true);
  });

  it('moves the cutoff of an account forward', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();

    await repository.revokeTokensOfAccount(accountId, CUTOFF, LATER_EXPIRY);
    await repository.revokeTokensOfAccount(accountId, secondsFromCutoff(120), LATER_EXPIRY);

    await expect(repository.isRevoked({accountId, issuedAt: secondsFromCutoff(60), tokenId: Uuid.create()})).resolves.toBe(true);
    await expect(repository.isRevoked({accountId, issuedAt: secondsFromCutoff(121), tokenId: Uuid.create()})).resolves.toBe(false);
  });

  it('never replaces a cutoff by an earlier one', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();

    await repository.revokeTokensOfAccount(accountId, secondsFromCutoff(120), LATER_EXPIRY);
    await repository.revokeTokensOfAccount(accountId, CUTOFF, secondsFromCutoff(60));

    await expect(repository.isRevoked({accountId, issuedAt: secondsFromCutoff(60), tokenId: Uuid.create()})).resolves.toBe(true);
  });

  it('keeps the latest of several cutoffs written at once', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const accountId = Uuid.create();
    const offsetList = [40, 10, 70, 30, 60, 20, 50, 0];
    const outcomeList = await Promise.allSettled(offsetList.map(async (offset): Promise<void> => repository.revokeTokensOfAccount(accountId, secondsFromCutoff(offset), LATER_EXPIRY)));

    expect(outcomeList.map((outcome) => outcome.status)).toStrictEqual(offsetList.map((): string => 'fulfilled'));
    await expect(repository.isRevoked({accountId, issuedAt: secondsFromCutoff(70), tokenId: Uuid.create()})).resolves.toBe(true);
    await expect(repository.isRevoked({accountId, issuedAt: secondsFromCutoff(71), tokenId: Uuid.create()})).resolves.toBe(false);
  });
};
