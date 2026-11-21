import {Logout} from '@account/application/useCase/Logout.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {RefreshTokenClaims} from '@account/domain/RefreshTokenVerifier.js';
import {Authentication} from '@core/domain/AccessTokenAuthenticator.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {RefreshTokenVerifierScripted} from '../../double/RefreshTokenVerifierScripted.js';
import {TokenRevocationRepositoryInMemory} from '../../double/TokenRevocationRepositoryInMemory.js';

const INVALID_REFRESH_TOKEN = new Unauthorized('Invalid refresh token');

const ISSUED_AT = new Date('2026-03-01T10:00:00.000Z');

const ACCESS_EXPIRES_AT = new Date('2026-03-01T10:15:00.000Z');

const REFRESH_EXPIRES_AT = new Date('2026-03-31T10:00:00.000Z');

const REFRESH_TOKEN = 'signed-refresh-token';

let authentication: Authentication;
let refreshTokenClaims: RefreshTokenClaims;
let refreshTokenVerifier: RefreshTokenVerifierScripted;
let tokenRevocationRepository: TokenRevocationRepositoryInMemory;
let logout: Logout;

beforeEach((): void => {
  const accountId = Uuid.create();

  authentication = {expiresAt: ACCESS_EXPIRES_AT, issuedAt: ISSUED_AT, subjectId: accountId, tokenId: Uuid.create()};
  refreshTokenClaims = {accountId, expiresAt: REFRESH_EXPIRES_AT, issuedAt: ISSUED_AT, provider: IDENTITY_PROVIDERS.PASSWORD, tokenId: Uuid.create()};
  refreshTokenVerifier = new RefreshTokenVerifierScripted();
  refreshTokenVerifier.claimsByToken.set(REFRESH_TOKEN, refreshTokenClaims);
  tokenRevocationRepository = new TokenRevocationRepositoryInMemory();
  logout = new Logout(refreshTokenVerifier, tokenRevocationRepository);
});

describe('Logout', (): void => {
  it('revokes the refresh token and then the access token, each until its own expiry', async (): Promise<void> => {
    await expect(logout.run(authentication, {refreshToken: REFRESH_TOKEN})).resolves.toBeUndefined();

    expect(tokenRevocationRepository.revokedTokenList).toStrictEqual([
      {expiresAt: REFRESH_EXPIRES_AT, tokenId: refreshTokenClaims.tokenId.toPrimitives()},
      {expiresAt: ACCESS_EXPIRES_AT, tokenId: authentication.tokenId.toPrimitives()}
    ]);
  });

  it('revokes the two tokens it is given and no other: it records no cutoff for the account', async (): Promise<void> => {
    await logout.run(authentication, {refreshToken: REFRESH_TOKEN});

    expect(tokenRevocationRepository.cutoffList).toStrictEqual([]);
    await expect(tokenRevocationRepository.isRevoked({accountId: authentication.subjectId, issuedAt: ISSUED_AT, tokenId: Uuid.create()})).resolves.toBe(false);
  });

  it('ignores unknown body fields', async (): Promise<void> => {
    await logout.run(authentication, {everywhere: true, refreshToken: REFRESH_TOKEN});

    expect(tokenRevocationRepository.revokedTokenList).toHaveLength(2);
    expect(tokenRevocationRepository.cutoffList).toStrictEqual([]);
  });

  it.each<[string, unknown, string]>([
    ['a body that is not an object', 'refresh', 'refreshToken is required'],
    ['a null body', null, 'refreshToken is required'],
    ['a missing refreshToken', {}, 'refreshToken is required'],
    ['a null refreshToken', {refreshToken: null}, 'refreshToken is required'],
    ['an empty refreshToken', {refreshToken: ''}, 'refreshToken is required'],
    ['a refreshToken that is a number', {refreshToken: 7}, 'refreshToken must be a string'],
    ['a refreshToken that is an object', {refreshToken: {token: REFRESH_TOKEN}}, 'refreshToken must be a string']
  ])('rejects %s and revokes nothing', async (_caseName: string, input: unknown, expectedMessage: string): Promise<void> => {
    await expect(logout.run(authentication, input)).rejects.toThrow(new InvalidArgument({customMessage: expectedMessage}));
    expect(tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('answers Invalid refresh token for a refresh token that is not valid, and revokes nothing', async (): Promise<void> => {
    await expect(logout.run(authentication, {refreshToken: 'another-token'})).rejects.toThrow(INVALID_REFRESH_TOKEN);
    expect(tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('answers Invalid refresh token for the refresh token of another account, and revokes nothing', async (): Promise<void> => {
    refreshTokenVerifier.claimsByToken.set(REFRESH_TOKEN, {...refreshTokenClaims, accountId: Uuid.create()});

    await expect(logout.run(authentication, {refreshToken: REFRESH_TOKEN})).rejects.toThrow(INVALID_REFRESH_TOKEN);
    expect(tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('does not refuse a refresh token that is already revoked: logging out twice succeeds both times', async (): Promise<void> => {
    await logout.run(authentication, {refreshToken: REFRESH_TOKEN});

    await expect(logout.run(authentication, {refreshToken: REFRESH_TOKEN})).resolves.toBeUndefined();
    expect(tokenRevocationRepository.revokedTokenList).toHaveLength(2);
  });

  it('surfaces the error when a revocation cannot be stored', async (): Promise<void> => {
    const failure = new Error('the store is down');

    tokenRevocationRepository.nextError = failure;

    await expect(logout.run(authentication, {refreshToken: REFRESH_TOKEN})).rejects.toBe(failure);
  });
});
