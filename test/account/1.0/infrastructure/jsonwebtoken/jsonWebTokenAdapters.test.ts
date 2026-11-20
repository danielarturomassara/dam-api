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

const NOW_SECONDS = NOW.getTime() / 1000;

const INVALID_REFRESH_TOKEN = new Unauthorized('Invalid refresh token');

const accountId = Uuid.create();

const tokenIssuer = new TokenIssuerJsonWebToken(new TokenSigningConfigFake(SECRET), new AccountConfigFake(), new CoreConfigFake({apiName: API_NAME}));
const refreshTokenVerifier = new RefreshTokenVerifierJsonWebToken(new TokenSigningConfigFake(SECRET), new CoreConfigFake({apiName: API_NAME}));

const decode = (token: string): Record<string, unknown> => {
  const payload = jsonwebtoken.verify(token, SECRET, {algorithms: ['HS256']});

  if (typeof payload === 'string') {
    throw new Error('The token payload is not an object.');
  }

  return payload;
};

const signRefreshLikeToken = (claims: Record<string, unknown>, options: jsonwebtoken.SignOptions = {}, secret: string = SECRET): string => {
  return jsonwebtoken.sign({provider: 'password', token_use: 'refresh', ...claims}, secret, {algorithm: 'HS256', expiresIn: 60, issuer: API_NAME, subject: accountId.toPrimitives(), ...options});
};

beforeEach((): void => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(NOW);
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('TokenIssuerJsonWebToken', (): void => {
  it('issues an access token carrying exactly the claims of the spec', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueAccessToken(accountId);
    const claims = decode(issuedToken.token);

    expect(issuedToken.expiresInSeconds).toBe(900);
    expect(claims).toStrictEqual({exp: NOW_SECONDS + 900, iat: NOW_SECONDS, iss: API_NAME, jti: claims.jti, sub: accountId.toPrimitives(), token_use: 'access'});
    expect((): unknown => Uuid.fromPrimitives(String(claims.jti))).not.toThrow();
  });

  it('issues a refresh token that also carries the proven provider', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueRefreshToken(accountId, IDENTITY_PROVIDERS.PHONE);
    const claims = decode(issuedToken.token);

    expect(issuedToken.expiresInSeconds).toBe(2_592_000);
    expect(claims).toStrictEqual({exp: NOW_SECONDS + 2_592_000, iat: NOW_SECONDS, iss: API_NAME, jti: claims.jti, provider: 'phone', sub: accountId.toPrimitives(), token_use: 'refresh'});
  });

  it('signs with HS256', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueAccessToken(accountId);

    expect(jsonwebtoken.decode(issuedToken.token, {complete: true})?.header).toMatchObject({alg: 'HS256'});
  });

  it('gives every token its own jti', async (): Promise<void> => {
    const first = decode((await tokenIssuer.issueAccessToken(accountId)).token);
    const second = decode((await tokenIssuer.issueAccessToken(accountId)).token);

    expect(first.jti).not.toBe(second.jti);
  });
});

describe('RefreshTokenVerifierJsonWebToken', (): void => {
  it('resolves the account and the provider of a refresh token the issuer signed', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueRefreshToken(accountId, IDENTITY_PROVIDERS.PHONE);
    const claims = await refreshTokenVerifier.verify(issuedToken.token);

    expect(claims.accountId.toPrimitives()).toBe(accountId.toPrimitives());
    expect(claims.provider).toBe(IDENTITY_PROVIDERS.PHONE);
  });

  it('accepts the token until its last second and refuses it once expired', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueRefreshToken(accountId, IDENTITY_PROVIDERS.PASSWORD);

    vi.setSystemTime(new Date(NOW.getTime() + 2_592_000_000 - 1000));
    await expect(refreshTokenVerifier.verify(issuedToken.token)).resolves.toBeDefined();

    vi.setSystemTime(new Date(NOW.getTime() + 2_592_000_000));
    await expect(refreshTokenVerifier.verify(issuedToken.token)).rejects.toThrow(INVALID_REFRESH_TOKEN);
  });

  it('refuses an access token presented as a refresh token', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueAccessToken(accountId);

    await expect(refreshTokenVerifier.verify(issuedToken.token)).rejects.toThrow(INVALID_REFRESH_TOKEN);
  });

  it.each<[string, () => string]>([
    ['text that is not a token', (): string => 'not-a-token'],
    ['a token signed with another secret', (): string => signRefreshLikeToken({}, {}, 'another-signing-secret-of-32-characters!')],
    ['a token of another issuer', (): string => signRefreshLikeToken({}, {issuer: 'another-api'})],
    ['a token without an issuer', (): string => jsonwebtoken.sign({provider: 'password', token_use: 'refresh'}, SECRET, {algorithm: 'HS256', expiresIn: 60, subject: accountId.toPrimitives()})],
    ['a token signed with another HMAC algorithm', (): string => signRefreshLikeToken({}, {algorithm: 'HS512'})],
    ['an unsigned token', (): string => jsonwebtoken.sign({provider: 'password', token_use: 'refresh'}, '', {algorithm: 'none', issuer: API_NAME, subject: accountId.toPrimitives()})],
    ['a token without token_use', (): string => signRefreshLikeToken({token_use: undefined})],
    ['a token whose subject is not a UUID', (): string => signRefreshLikeToken({}, {subject: 'someone'})],
    ['a token without a subject', (): string => jsonwebtoken.sign({provider: 'password', token_use: 'refresh'}, SECRET, {algorithm: 'HS256', expiresIn: 60, issuer: API_NAME})],
    ['a token of an unknown provider', (): string => signRefreshLikeToken({provider: 'carrier-pigeon'})],
    ['a token whose provider is an inherited property name', (): string => signRefreshLikeToken({provider: 'toString'})],
    ['a token without a provider', (): string => signRefreshLikeToken({provider: undefined})],
    ['a token that never expires', (): string => jsonwebtoken.sign({provider: 'password', token_use: 'refresh'}, SECRET, {algorithm: 'HS256', issuer: API_NAME, subject: accountId.toPrimitives()})]
  ])('answers the one Invalid refresh token message for %s', async (_caseName: string, buildToken: () => string): Promise<void> => {
    await expect(refreshTokenVerifier.verify(buildToken())).rejects.toThrow(INVALID_REFRESH_TOKEN);
  });
});
