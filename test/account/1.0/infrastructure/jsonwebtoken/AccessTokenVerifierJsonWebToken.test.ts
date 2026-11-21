import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {AccessTokenVerifierJsonWebToken} from '@account/infrastructure/jsonwebtoken/AccessTokenVerifierJsonWebToken.js';
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

const INVALID_ACCESS_TOKEN = new Unauthorized('Invalid access token');

const accountId = Uuid.create();

const tokenId = Uuid.create();

const tokenIssuer = new TokenIssuerJsonWebToken(new TokenSigningConfigFake(SECRET), new AccountConfigFake(), new CoreConfigFake({apiName: API_NAME}));
const accessTokenVerifier = new AccessTokenVerifierJsonWebToken(new TokenSigningConfigFake(SECRET), new CoreConfigFake({apiName: API_NAME}));

const signAccessLikeToken = (claims: Record<string, unknown>, options: jsonwebtoken.SignOptions = {}, secret: string = SECRET): string => {
  return jsonwebtoken.sign({token_use: 'access', ...claims}, secret, {algorithm: 'HS256', expiresIn: 60, issuer: API_NAME, jwtid: tokenId.toPrimitives(), subject: accountId.toPrimitives(), ...options});
};

const signWithoutOption = (omittedOption: 'expiresIn' | 'issuer' | 'jwtid' | 'subject'): string => {
  const options: jsonwebtoken.SignOptions = {algorithm: 'HS256', expiresIn: 60, issuer: API_NAME, jwtid: tokenId.toPrimitives(), subject: accountId.toPrimitives()};

  Reflect.deleteProperty(options, omittedOption);

  return jsonwebtoken.sign({token_use: 'access'}, SECRET, options);
};

const encodeSegment = (text: string): string => Buffer.from(text).toString('base64url');

const buildTokenWithPayloadText = (payloadText: string): string => {
  return `${encodeSegment(JSON.stringify({alg: 'HS256', typ: 'JWT'}))}.${encodeSegment(payloadText)}.AAAA`;
};

beforeEach((): void => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(NOW);
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('AccessTokenVerifierJsonWebToken', (): void => {
  it('resolves the account, the token id and the validity of an access token the issuer signed', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueAccessToken(accountId);
    const signedClaims = jsonwebtoken.decode(issuedToken.token, {json: true});
    const claims = await accessTokenVerifier.verify(issuedToken.token);

    expect(Object.keys(claims).sort()).toStrictEqual(['accountId', 'expiresAt', 'issuedAt', 'tokenId']);
    expect(claims.accountId.toPrimitives()).toBe(accountId.toPrimitives());
    expect(claims.tokenId.toPrimitives()).toBe(signedClaims?.jti);
    expect(claims.issuedAt).toStrictEqual(NOW);
    expect(claims.expiresAt).toStrictEqual(new Date(NOW.getTime() + 900_000));
  });

  it('accepts the token until its last second and refuses it once expired', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueAccessToken(accountId);

    vi.setSystemTime(new Date(NOW.getTime() + 900_000 - 1000));
    await expect(accessTokenVerifier.verify(issuedToken.token)).resolves.toBeDefined();

    vi.setSystemTime(new Date(NOW.getTime() + 900_000));
    await expect(accessTokenVerifier.verify(issuedToken.token)).rejects.toThrow(INVALID_ACCESS_TOKEN);
  });

  it('refuses a refresh token presented as an access token', async (): Promise<void> => {
    const issuedToken = await tokenIssuer.issueRefreshToken(accountId, IDENTITY_PROVIDERS.PASSWORD);

    await expect(accessTokenVerifier.verify(issuedToken.token)).rejects.toThrow(INVALID_ACCESS_TOKEN);
  });

  it('accepts a hand-signed token that carries every claim of the spec', async (): Promise<void> => {
    const claims = await accessTokenVerifier.verify(signAccessLikeToken({}));

    expect(claims.tokenId.toPrimitives()).toBe(tokenId.toPrimitives());
    expect(claims.accountId.toPrimitives()).toBe(accountId.toPrimitives());
  });

  it.each<[string, () => string]>([
    ['text that is not a token', (): string => 'not-a-token'],
    ['an empty token', (): string => ''],
    ['a token whose payload is not JSON', (): string => buildTokenWithPayloadText('not json')],
    ['a token whose payload is a JSON text and not an object', (): string => buildTokenWithPayloadText('"someone"')],
    ['a token signed with another secret', (): string => signAccessLikeToken({}, {}, 'another-signing-secret-of-32-characters!')],
    ['a token of another issuer', (): string => signAccessLikeToken({}, {issuer: 'another-api'})],
    ['a token without an issuer', (): string => signWithoutOption('issuer')],
    ['a token signed with another HMAC algorithm', (): string => signAccessLikeToken({}, {algorithm: 'HS512'})],
    ['an unsigned token', (): string => jsonwebtoken.sign({token_use: 'access'}, '', {algorithm: 'none', issuer: API_NAME, jwtid: tokenId.toPrimitives(), subject: accountId.toPrimitives()})],
    ['a token without token_use', (): string => signAccessLikeToken({token_use: undefined})],
    ['a token of an unknown use', (): string => signAccessLikeToken({token_use: 'session'})],
    ['a token whose subject is not a UUID', (): string => signAccessLikeToken({}, {subject: 'someone'})],
    ['a token without a subject', (): string => signWithoutOption('subject')],
    ['a token whose jti is not a UUID', (): string => signAccessLikeToken({}, {jwtid: 'token-one'})],
    ['a token without a jti', (): string => signWithoutOption('jwtid')],
    ['a token without an issue instant', (): string => signAccessLikeToken({}, {noTimestamp: true})],
    ['a token that never expires', (): string => signWithoutOption('expiresIn')],
    ['a token that is not yet valid', (): string => signAccessLikeToken({}, {notBefore: 60})]
  ])('answers the one Invalid access token message for %s', async (_caseName: string, buildToken: () => string): Promise<void> => {
    await expect(accessTokenVerifier.verify(buildToken())).rejects.toThrow(INVALID_ACCESS_TOKEN);
  });

  it('never repeats any part of a refused token in its error', async (): Promise<void> => {
    const refusal: unknown = await accessTokenVerifier.verify(buildTokenWithPayloadText('secret-payload-text')).catch((error: unknown): unknown => error);

    expect(refusal).toStrictEqual(INVALID_ACCESS_TOKEN);
    expect(refusal instanceof Error ? `${refusal.message} ${refusal.stack}` : '').not.toContain('secret-payload-text');
  });

  it('surfaces a failure that is not about the token as it is', async (): Promise<void> => {
    const failure = new Error('the secret store is down');
    const failingVerifier = new AccessTokenVerifierJsonWebToken({
      getSigningSecret: (): string => {
        throw failure;
      }
    }, new CoreConfigFake({apiName: API_NAME}));

    await expect(failingVerifier.verify(signAccessLikeToken({}))).rejects.toBe(failure);
  });
});
