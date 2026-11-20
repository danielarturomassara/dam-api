import {RefreshAccessToken} from '@account/application/useCase/RefreshAccessToken.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {RefreshTokenClaims} from '@account/domain/RefreshTokenVerifier.js';
import {IssuedToken, TokenIssuer} from '@account/domain/TokenIssuer.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountRepositoryInMemory} from '../../double/AccountRepositoryInMemory.js';
import {buildPasswordLoginAccount} from '../../double/loginFixtures.js';
import {RefreshTokenVerifierScripted} from '../../double/RefreshTokenVerifierScripted.js';
import {TokenIssuerFake} from '../../double/TokenIssuerFake.js';
import {TokenRevocationRepositoryInMemory} from '../../double/TokenRevocationRepositoryInMemory.js';

const INVALID_REFRESH_TOKEN = new Unauthorized('Invalid refresh token');

const ISSUED_AT = new Date('2026-03-01T10:00:00.000Z');

const EXPIRES_AT = new Date('2026-03-31T10:00:00.000Z');

const REFRESH_TOKEN = 'signed-refresh-token';

let accountRepository: AccountRepositoryInMemory;
let refreshTokenClaims: RefreshTokenClaims;
let refreshTokenVerifier: RefreshTokenVerifierScripted;
let tokenIssuer: TokenIssuerFake;
let tokenRevocationRepository: TokenRevocationRepositoryInMemory;
let refreshAccessToken: RefreshAccessToken;

beforeEach(async (): Promise<void> => {
  const account = buildPasswordLoginAccount('someone@example.com');

  accountRepository = new AccountRepositoryInMemory();
  await accountRepository.create(account);

  refreshTokenClaims = {accountId: account.id, expiresAt: EXPIRES_AT, issuedAt: ISSUED_AT, provider: IDENTITY_PROVIDERS.PASSWORD, tokenId: Uuid.create()};
  refreshTokenVerifier = new RefreshTokenVerifierScripted();
  refreshTokenVerifier.claimsByToken.set(REFRESH_TOKEN, refreshTokenClaims);
  tokenIssuer = new TokenIssuerFake();
  tokenRevocationRepository = new TokenRevocationRepositoryInMemory();
  refreshAccessToken = new RefreshAccessToken(refreshTokenVerifier, accountRepository, tokenIssuer, tokenRevocationRepository);
});

describe('RefreshAccessToken and revocation', (): void => {
  it('exchanges a valid refresh token that is not revoked', async (): Promise<void> => {
    await expect(refreshAccessToken.run({refreshToken: REFRESH_TOKEN})).resolves.toMatchObject({tokenType: 'Bearer'});
    expect(tokenIssuer.issuedList).toHaveLength(1);
  });

  it('answers the one Invalid refresh token message for a token revoked by its id, issuing nothing', async (): Promise<void> => {
    await tokenRevocationRepository.revokeToken(refreshTokenClaims.tokenId, EXPIRES_AT);

    await expect(refreshAccessToken.run({refreshToken: REFRESH_TOKEN})).rejects.toThrow(INVALID_REFRESH_TOKEN);
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });

  it('answers the one Invalid refresh token message for a token issued at or before the cutoff of its account', async (): Promise<void> => {
    await tokenRevocationRepository.revokeTokensOfAccount(refreshTokenClaims.accountId, ISSUED_AT, EXPIRES_AT);

    await expect(refreshAccessToken.run({refreshToken: REFRESH_TOKEN})).rejects.toThrow(INVALID_REFRESH_TOKEN);
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });

  it('exchanges a refresh token issued after the cutoff of its account', async (): Promise<void> => {
    await tokenRevocationRepository.revokeTokensOfAccount(refreshTokenClaims.accountId, new Date(ISSUED_AT.getTime() - 1000), EXPIRES_AT);

    await expect(refreshAccessToken.run({refreshToken: REFRESH_TOKEN})).resolves.toMatchObject({tokenType: 'Bearer'});
  });

  it('checks the revocation before loading the account: a revoked token of a disabled account answers Invalid refresh token', async (): Promise<void> => {
    const disabledAccount = buildPasswordLoginAccount('disabled@example.com', {isAccountDisabled: true});

    await accountRepository.create(disabledAccount);
    refreshTokenVerifier.claimsByToken.set(REFRESH_TOKEN, {...refreshTokenClaims, accountId: disabledAccount.id});
    await tokenRevocationRepository.revokeToken(refreshTokenClaims.tokenId, EXPIRES_AT);

    await expect(refreshAccessToken.run({refreshToken: REFRESH_TOKEN})).rejects.toThrow(INVALID_REFRESH_TOKEN);
  });

  it('never answers an access token when the refresh token was revoked while the access token was being issued', async (): Promise<void> => {
    const revokingTokenIssuer: TokenIssuer = {
      issueAccessToken: async (accountId: Uuid): Promise<IssuedToken> => {
        await tokenRevocationRepository.revokeTokensOfAccount(accountId, ISSUED_AT, EXPIRES_AT);

        return tokenIssuer.issueAccessToken(accountId);
      },
      issueRefreshToken: async (accountId: Uuid, provider: IDENTITY_PROVIDERS): Promise<IssuedToken> => tokenIssuer.issueRefreshToken(accountId, provider)
    };
    const racingRefreshAccessToken = new RefreshAccessToken(refreshTokenVerifier, accountRepository, revokingTokenIssuer, tokenRevocationRepository);

    await expect(racingRefreshAccessToken.run({refreshToken: REFRESH_TOKEN})).rejects.toThrow(INVALID_REFRESH_TOKEN);
  });

  it('fails closed: the error surfaces and nothing is issued when the revocations cannot be read', async (): Promise<void> => {
    const failure = new Error('the store is down');

    tokenRevocationRepository.nextError = failure;

    await expect(refreshAccessToken.run({refreshToken: REFRESH_TOKEN})).rejects.toBe(failure);
    expect(tokenIssuer.issuedList).toStrictEqual([]);
  });
});
