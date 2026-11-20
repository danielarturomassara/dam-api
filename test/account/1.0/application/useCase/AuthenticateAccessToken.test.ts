import {AuthenticateAccessToken} from '@account/application/useCase/AuthenticateAccessToken.js';
import {AccessTokenClaims} from '@account/domain/AccessTokenVerifier.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccessTokenVerifierScripted} from '../../double/AccessTokenVerifierScripted.js';
import {TokenRevocationRepositoryInMemory} from '../../double/TokenRevocationRepositoryInMemory.js';

const INVALID_ACCESS_TOKEN = new Unauthorized('Invalid access token');

const ISSUED_AT = new Date('2026-03-01T10:00:00.000Z');

const EXPIRES_AT = new Date('2026-03-01T10:15:00.000Z');

const ACCESS_TOKEN = 'signed-access-token';

let accessTokenClaims: AccessTokenClaims;
let accessTokenVerifier: AccessTokenVerifierScripted;
let tokenRevocationRepository: TokenRevocationRepositoryInMemory;
let authenticateAccessToken: AuthenticateAccessToken;

beforeEach((): void => {
  accessTokenClaims = {accountId: Uuid.create(), expiresAt: EXPIRES_AT, issuedAt: ISSUED_AT, tokenId: Uuid.create()};
  accessTokenVerifier = new AccessTokenVerifierScripted();
  accessTokenVerifier.claimsByToken.set(ACCESS_TOKEN, accessTokenClaims);
  tokenRevocationRepository = new TokenRevocationRepositoryInMemory();
  authenticateAccessToken = new AuthenticateAccessToken(accessTokenVerifier, tokenRevocationRepository);
});

describe('AuthenticateAccessToken', (): void => {
  it('resolves the claims of a valid token that is not revoked', async (): Promise<void> => {
    await expect(authenticateAccessToken.run(ACCESS_TOKEN)).resolves.toStrictEqual(accessTokenClaims);
  });

  it('answers Invalid access token for a token that is not valid', async (): Promise<void> => {
    await expect(authenticateAccessToken.run('another-token')).rejects.toThrow(INVALID_ACCESS_TOKEN);
  });

  it('answers the same Invalid access token for a valid token that was revoked by its id', async (): Promise<void> => {
    await tokenRevocationRepository.revokeToken(accessTokenClaims.tokenId, EXPIRES_AT);

    await expect(authenticateAccessToken.run(ACCESS_TOKEN)).rejects.toThrow(INVALID_ACCESS_TOKEN);
  });

  it('answers the same Invalid access token for a valid token issued at or before the cutoff of its account', async (): Promise<void> => {
    await tokenRevocationRepository.revokeTokensOfAccount(accessTokenClaims.accountId, ISSUED_AT, EXPIRES_AT);

    await expect(authenticateAccessToken.run(ACCESS_TOKEN)).rejects.toThrow(INVALID_ACCESS_TOKEN);
  });

  it('authenticates a token issued after the cutoff of its account', async (): Promise<void> => {
    await tokenRevocationRepository.revokeTokensOfAccount(accessTokenClaims.accountId, new Date(ISSUED_AT.getTime() - 1000), EXPIRES_AT);

    await expect(authenticateAccessToken.run(ACCESS_TOKEN)).resolves.toStrictEqual(accessTokenClaims);
  });

  it('is not affected by the revocations of another token or another account', async (): Promise<void> => {
    await tokenRevocationRepository.revokeToken(Uuid.create(), EXPIRES_AT);
    await tokenRevocationRepository.revokeTokensOfAccount(Uuid.create(), EXPIRES_AT, EXPIRES_AT);

    await expect(authenticateAccessToken.run(ACCESS_TOKEN)).resolves.toStrictEqual(accessTokenClaims);
  });

  it('checks the revocation on every call, so a revocation holds from the next request on', async (): Promise<void> => {
    await expect(authenticateAccessToken.run(ACCESS_TOKEN)).resolves.toStrictEqual(accessTokenClaims);

    await tokenRevocationRepository.revokeToken(accessTokenClaims.tokenId, EXPIRES_AT);

    await expect(authenticateAccessToken.run(ACCESS_TOKEN)).rejects.toThrow(INVALID_ACCESS_TOKEN);
  });

  it('fails closed: the error surfaces when the revocations cannot be read', async (): Promise<void> => {
    const failure = new Error('the store is down');

    tokenRevocationRepository.nextError = failure;

    await expect(authenticateAccessToken.run(ACCESS_TOKEN)).rejects.toBe(failure);
  });

  it('writes nothing', async (): Promise<void> => {
    await authenticateAccessToken.run(ACCESS_TOKEN);

    expect(tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
    expect(tokenRevocationRepository.cutoffList).toStrictEqual([]);
  });
});
