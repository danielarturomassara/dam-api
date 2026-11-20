import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {RefreshTokenVerifierJsonWebToken} from '@account/infrastructure/jsonwebtoken/RefreshTokenVerifierJsonWebToken.js';
import {TokenIssuerJsonWebToken} from '@account/infrastructure/jsonwebtoken/TokenIssuerJsonWebToken.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import jsonwebtoken from 'jsonwebtoken';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CoreConfigFake} from '../../../../core/1.0/double/CoreConfigFake.js';
import {AccountConfigFake} from '../../double/AccountConfigFake.js';
import {TokenSigningConfigFake} from '../../double/TokenSigningConfigFake.js';

const SECRET = 'test-signing-secret-of-at-least-32-characters';

const API_NAME = 'api-test';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const INVALID_REFRESH_TOKEN = new Unauthorized('Invalid refresh token');

const accountId = Uuid.create();

const tokenId = Uuid.create();

const tokenIssuer = new TokenIssuerJsonWebToken(new TokenSigningConfigFake(SECRET), new AccountConfigFake(), new CoreConfigFake({apiName: API_NAME}));
const refreshTokenVerifier = new RefreshTokenVerifierJsonWebToken(new TokenSigningConfigFake(SECRET), new CoreConfigFake({apiName: API_NAME}));

const signRefreshLikeToken = (options: jsonwebtoken.SignOptions): string => {
  return jsonwebtoken.sign({provider: 'password', token_use: 'refresh'}, SECRET, {algorithm: 'HS256', expiresIn: 60, issuer: API_NAME, subject: accountId.toPrimitives(), ...options});
};

beforeEach((): void => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(NOW);
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('RefreshTokenVerifierJsonWebToken claims', (): void => {
  it('resolves the token id and the validity of a refresh token the issuer signed, with its account and provider', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueRefreshToken(accountId, IDENTITY_PROVIDERS.PHONE);
    const signedClaims = jsonwebtoken.decode(issuedToken.token, {json: true});
    const claims = await refreshTokenVerifier.verify(issuedToken.token);

    expect(Object.keys(claims).sort()).toStrictEqual(['accountId', 'expiresAt', 'issuedAt', 'provider', 'tokenId']);
    expect(claims.accountId.toPrimitives()).toBe(accountId.toPrimitives());
    expect(claims.provider).toBe(IDENTITY_PROVIDERS.PHONE);
    expect(claims.tokenId.toPrimitives()).toBe(signedClaims?.jti);
    expect(claims.issuedAt).toStrictEqual(NOW);
    expect(claims.expiresAt).toStrictEqual(new Date(NOW.getTime() + 2_592_000_000));
  });

  it('accepts a hand-signed token whose jti is a UUID', async (): Promise<void> => {
    const claims = await refreshTokenVerifier.verify(signRefreshLikeToken({jwtid: tokenId.toPrimitives()}));

    expect(claims.tokenId.toPrimitives()).toBe(tokenId.toPrimitives());
  });

  it('answers the one Invalid refresh token message for a token whose payload is not JSON', async (): Promise<void> => {
    const encodeSegment = (text: string): string => Buffer.from(text).toString('base64url');
    const token = `${encodeSegment(JSON.stringify({alg: 'HS256', typ: 'JWT'}))}.${encodeSegment('not json')}.AAAA`;

    await expect(refreshTokenVerifier.verify(token)).rejects.toStrictEqual(INVALID_REFRESH_TOKEN);
  });

  it.each<[string, jsonwebtoken.SignOptions]>([
    ['a token without a jti', {}],
    ['a token whose jti is not a UUID', {jwtid: 'token-one'}],
    ['a token without an issue instant', {jwtid: tokenId.toPrimitives(), noTimestamp: true}]
  ])('answers the one Invalid refresh token message for %s', async (_caseName: string, options: jsonwebtoken.SignOptions): Promise<void> => {
    await expect(refreshTokenVerifier.verify(signRefreshLikeToken(options))).rejects.toThrow(INVALID_REFRESH_TOKEN);
  });
});
