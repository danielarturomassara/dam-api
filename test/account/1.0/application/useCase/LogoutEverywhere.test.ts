import {LogoutEverywhere} from '@account/application/useCase/LogoutEverywhere.js';
import {Authentication} from '@core/domain/AccessTokenAuthenticator.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {AccountConfigFake} from '../../double/AccountConfigFake.js';
import {TokenRevocationRepositoryInMemory} from '../../double/TokenRevocationRepositoryInMemory.js';

const NOW = new Date('2026-03-01T10:00:00.400Z');

const REFRESH_TOKEN_LIFETIME_SECONDS = 7200;

let authentication: Authentication;
let tokenRevocationRepository: TokenRevocationRepositoryInMemory;
let logoutEverywhere: LogoutEverywhere;

const isRevoked = async (issuedAt: Date, accountId: Uuid = authentication.subjectId): Promise<boolean> => {
  return tokenRevocationRepository.isRevoked({accountId, issuedAt, tokenId: Uuid.create()});
};

beforeEach((): void => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(NOW);

  authentication = {expiresAt: new Date('2026-03-01T10:05:00.000Z'), issuedAt: new Date('2026-03-01T09:50:00.000Z'), subjectId: Uuid.create(), tokenId: Uuid.create()};
  tokenRevocationRepository = new TokenRevocationRepositoryInMemory();
  logoutEverywhere = new LogoutEverywhere(tokenRevocationRepository, new AccountConfigFake({}, 6, {maximumRequests: 20, windowSeconds: 300}, {refreshTokenLifetimeSeconds: REFRESH_TOKEN_LIFETIME_SECONDS}));
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('LogoutEverywhere', (): void => {
  it('records the instant of the request as the cutoff of the account, kept for one refresh token lifetime', async (): Promise<void> => {
    await expect(logoutEverywhere.run(authentication)).resolves.toBeUndefined();

    expect(tokenRevocationRepository.cutoffList).toStrictEqual([
      {accountId: authentication.subjectId.toPrimitives(), expiresAt: new Date(NOW.getTime() + REFRESH_TOKEN_LIFETIME_SECONDS * 1000), issuedUntil: NOW}
    ]);
    expect(tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('revokes the access token of the request and every token issued before it', async (): Promise<void> => {
    await logoutEverywhere.run(authentication);

    await expect(isRevoked(authentication.issuedAt)).resolves.toBe(true);
    await expect(isRevoked(new Date('2026-02-01T10:00:00.000Z'))).resolves.toBe(true);
  });

  it('revokes a token issued in the same second as the cutoff, and not one issued the second after', async (): Promise<void> => {
    await logoutEverywhere.run(authentication);

    await expect(isRevoked(new Date('2026-03-01T10:00:00.000Z'))).resolves.toBe(true);
    await expect(isRevoked(new Date('2026-03-01T10:00:01.000Z'))).resolves.toBe(false);
  });

  it('leaves the tokens of every other account alone', async (): Promise<void> => {
    await logoutEverywhere.run(authentication);

    await expect(isRevoked(authentication.issuedAt, Uuid.create())).resolves.toBe(false);
  });

  it('moves the cutoff forward when the account logs out everywhere again', async (): Promise<void> => {
    await logoutEverywhere.run(authentication);

    vi.setSystemTime(new Date(NOW.getTime() + 60_000));
    await logoutEverywhere.run(authentication);

    await expect(isRevoked(new Date(NOW.getTime() + 30_000))).resolves.toBe(true);
    expect(tokenRevocationRepository.cutoffList).toHaveLength(1);
  });

  it('revokes a token issued while its first write was in flight, so no token of the account outlives the answer', async (): Promise<void> => {
    class SlowTokenRevocationRepository extends TokenRevocationRepositoryInMemory {
      public override async revokeTokensOfAccount (accountId: Uuid, issuedUntil: Date, expiresAt: Date): Promise<void> {
        await super.revokeTokensOfAccount(accountId, issuedUntil, expiresAt);

        vi.setSystemTime(new Date(Date.now() + 1500));
      }
    }

    tokenRevocationRepository = new SlowTokenRevocationRepository();
    logoutEverywhere = new LogoutEverywhere(tokenRevocationRepository, new AccountConfigFake());

    await logoutEverywhere.run(authentication);

    await expect(isRevoked(new Date('2026-03-01T10:00:01.000Z'))).resolves.toBe(true);
  });

  it('surfaces the error when the revocation cannot be stored', async (): Promise<void> => {
    const failure = new Error('the store is down');

    tokenRevocationRepository.nextError = failure;

    await expect(logoutEverywhere.run(authentication)).rejects.toBe(failure);
  });
});
