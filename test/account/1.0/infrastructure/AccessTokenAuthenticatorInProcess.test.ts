import {AuthenticateAccessToken} from '@account/application/useCase/AuthenticateAccessToken.js';
import {AccessTokenClaims} from '@account/domain/AccessTokenVerifier.js';
import {AccessTokenAuthenticatorInProcess} from '@account/infrastructure/AccessTokenAuthenticatorInProcess.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccessTokenVerifierScripted} from '../double/AccessTokenVerifierScripted.js';
import {TokenRevocationRepositoryInMemory} from '../double/TokenRevocationRepositoryInMemory.js';

const ACCESS_TOKEN = 'signed-access-token';

let accessTokenClaims: AccessTokenClaims;
let tokenRevocationRepository: TokenRevocationRepositoryInMemory;
let accessTokenAuthenticator: AccessTokenAuthenticatorInProcess;

beforeEach((): void => {
  const accessTokenVerifier = new AccessTokenVerifierScripted();

  accessTokenClaims = {accountId: Uuid.create(), expiresAt: new Date('2026-03-01T10:15:00.000Z'), issuedAt: new Date('2026-03-01T10:00:00.000Z'), tokenId: Uuid.create()};
  accessTokenVerifier.claimsByToken.set(ACCESS_TOKEN, accessTokenClaims);
  tokenRevocationRepository = new TokenRevocationRepositoryInMemory();
  accessTokenAuthenticator = new AccessTokenAuthenticatorInProcess(new AuthenticateAccessToken(accessTokenVerifier, tokenRevocationRepository));
});

describe('AccessTokenAuthenticatorInProcess', (): void => {
  it('resolves the core Authentication of a token, with the account id as its subject', async (): Promise<void> => {
    await expect(accessTokenAuthenticator.authenticate(ACCESS_TOKEN)).resolves.toStrictEqual({
      expiresAt: accessTokenClaims.expiresAt,
      issuedAt: accessTokenClaims.issuedAt,
      subjectId: accessTokenClaims.accountId,
      tokenId: accessTokenClaims.tokenId
    });
  });

  it('refuses a token that is not valid with Unauthorized', async (): Promise<void> => {
    await expect(accessTokenAuthenticator.authenticate('another-token')).rejects.toThrow(new Unauthorized('Invalid access token'));
  });

  it('refuses a revoked token with the same Unauthorized', async (): Promise<void> => {
    await tokenRevocationRepository.revokeToken(accessTokenClaims.tokenId, accessTokenClaims.expiresAt);

    await expect(accessTokenAuthenticator.authenticate(ACCESS_TOKEN)).rejects.toThrow(new Unauthorized('Invalid access token'));
  });
});
