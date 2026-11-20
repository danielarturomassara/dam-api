import jsonwebtoken from 'jsonwebtoken';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {buildPasswordLoginAccount, LOGIN_PASSWORD} from '../double/loginFixtures.js';
import {CONTRACT_API_NAME, CONTRACT_SIGNING_SECRET, ContractResponse, LoginContractHarness} from './loginContractHarness.js';
import {postWithHeaders} from './postWithHeaders.js';

const PORT = 43127;

const harness = new LoginContractHarness(PORT);

const EMAIL = 'someone@example.com';

const OTHER_EMAIL = 'someone-else@example.com';

interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

const login = async (email: string = EMAIL): Promise<LoginTokens> => {
  const response = await harness.post('/auth/login', {provider: 'password', providerData: {email, password: LOGIN_PASSWORD}});

  return JSON.parse(response.body) as LoginTokens;
};

const logout = async (accessToken: string, body: unknown): Promise<ContractResponse> => {
  return postWithHeaders(PORT, '/auth/logout', {authorization: `Bearer ${accessToken}`}, body);
};

const readTokenId = (token: string): string => String(jsonwebtoken.decode(token, {json: true})?.jti);

const readExpiry = (token: string): Date => new Date(Number(jsonwebtoken.decode(token, {json: true})?.exp) * 1000);

beforeAll(async (): Promise<void> => harness.start());

afterAll(async (): Promise<void> => harness.stop());

beforeEach(async (): Promise<void> => {
  harness.reset();
  harness.tokenRevocationRepository.writeOutcomeList.splice(0);

  await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));
});

describe('POST /auth/logout contract (spec/approved/account.spec.md §3.11)', (): void => {
  it('204 No Content, empty body — both tokens are revoked, each until its own expiry', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();
    const response = await logout(accessToken, {refreshToken});

    expect(response.status).toBe(204);
    expect(response.body).toBe('');
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([
      {expiresAt: readExpiry(refreshToken), tokenId: readTokenId(refreshToken)},
      {expiresAt: readExpiry(accessToken), tokenId: readTokenId(accessToken)}
    ]);
    expect(harness.tokenRevocationRepository.cutoffList).toStrictEqual([]);
  });

  it('ends the login: the refresh token is no longer exchanged and the access token no longer authenticates', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();

    await logout(accessToken, {refreshToken});

    const refreshResponse = await harness.post('/auth/token/refresh', {refreshToken});
    const secondLogoutResponse = await logout(accessToken, {refreshToken});

    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body).toBe('"Unauthorized. Reason: Invalid refresh token."');
    expect(refreshResponse.challenge).toBe('Bearer');
    expect(secondLogoutResponse.status).toBe(401);
    expect(secondLogoutResponse.body).toBe('"Unauthorized. Reason: Invalid access token."');
  });

  it('ends one login and no other: another login of the same account keeps working', async (): Promise<void> => {
    const firstLogin = await login();
    const secondLogin = await login();

    await logout(firstLogin.accessToken, {refreshToken: firstLogin.refreshToken});

    const refreshResponse = await harness.post('/auth/token/refresh', {refreshToken: secondLogin.refreshToken});

    expect(refreshResponse.status).toBe(200);
  });

  it('204 again — logging out twice with the same refresh token and another access token that is still valid', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();
    const refreshResponse = await harness.post('/auth/token/refresh', {refreshToken});
    const siblingAccessToken = String((JSON.parse(refreshResponse.body) as Record<string, unknown>).accessToken);

    const firstResponse = await logout(accessToken, {refreshToken});
    const secondResponse = await logout(siblingAccessToken, {refreshToken});

    expect([firstResponse.status, secondResponse.status]).toStrictEqual([204, 204]);
  });

  it('ignores unknown body fields', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();
    const response = await logout(accessToken, {everywhere: true, refreshToken});

    expect(response.status).toBe(204);
    expect(harness.tokenRevocationRepository.cutoffList).toStrictEqual([]);
  });

  it('is not throttled', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();

    harness.requestThrottle.consumedList.splice(0);
    harness.requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 17};

    const response = await logout(accessToken, {refreshToken});

    expect(response.status).toBe(204);
    expect(harness.requestThrottle.consumedList).toStrictEqual([]);
  });

  it.each([
    ['a malformed JSON body', '{"refreshToken":', '"Malformed JSON body"'],
    ['a missing refreshToken', '{}', '"refreshToken is required"'],
    ['a refreshToken that is not a string', '{"refreshToken":7}', '"refreshToken must be a string"']
  ])('400 Bad Request, JSON string reason — %s', async (_caseName: string, body: string, expectedBody: string): Promise<void> => {
    const {accessToken} = await login();
    const response = await logout(accessToken, body);

    expect(response.status).toBe(400);
    expect(response.body).toBe(expectedBody);
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it.each([
    ['no Authorization header', {}],
    ['another scheme', {authorization: 'Basic abc123'}]
  ])('401 Unauthorized with the Bearer challenge, Missing access token — %s', async (_caseName: string, headers: Record<string, string>): Promise<void> => {
    const {refreshToken} = await login();
    const response = await postWithHeaders(PORT, '/auth/logout', headers, {refreshToken});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Missing access token."');
    expect(response.challenge).toBe('Bearer');
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('authenticates before it validates the body: no token and no refreshToken answers 401', async (): Promise<void> => {
    const response = await postWithHeaders(PORT, '/auth/logout', {}, {});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Missing access token."');
  });

  it.each<[string, (tokens: LoginTokens) => string]>([
    ['text that is not a token', (): string => 'not-a-token'],
    ['a refresh token presented as an access token', (tokens: LoginTokens): string => tokens.refreshToken],
    ['a token signed with another secret', (): string => jsonwebtoken.sign({token_use: 'access'}, 'another-signing-secret-of-32-characters!', {algorithm: 'HS256', expiresIn: 60})]
  ])('401 Unauthorized with the Bearer challenge, Invalid access token — %s', async (_caseName: string, buildAccessToken: (tokens: LoginTokens) => string): Promise<void> => {
    const tokens = await login();
    const response = await logout(buildAccessToken(tokens), {refreshToken: tokens.refreshToken});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid access token."');
    expect(response.challenge).toBe('Bearer');
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it.each<[string, (tokens: LoginTokens, otherTokens: LoginTokens) => string]>([
    ['text that is not a token', (): string => 'not-a-token'],
    ['an access token presented as a refresh token', (tokens: LoginTokens): string => tokens.accessToken],
    ['the refresh token of another account', (_tokens: LoginTokens, otherTokens: LoginTokens): string => otherTokens.refreshToken]
  ])('401 Unauthorized with the Bearer challenge, Invalid refresh token, nothing revoked — %s', async (_caseName: string, buildRefreshToken: (tokens: LoginTokens, otherTokens: LoginTokens) => string): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(OTHER_EMAIL));

    const tokens = await login();
    const otherTokens = await login(OTHER_EMAIL);
    const response = await logout(tokens.accessToken, {refreshToken: buildRefreshToken(tokens, otherTokens)});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid refresh token."');
    expect(response.challenge).toBe('Bearer');
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('401 Unauthorized, Invalid refresh token, nothing revoked — an expired refresh token of the same account', async (): Promise<void> => {
    const {accessToken} = await login();
    const account = harness.accountRepository.accountList[0];
    const expiredRefreshToken = jsonwebtoken.sign({provider: 'password', token_use: 'refresh'}, CONTRACT_SIGNING_SECRET, {
      algorithm: 'HS256',
      expiresIn: -10,
      issuer: CONTRACT_API_NAME,
      jwtid: readTokenId(accessToken),
      subject: account?.id.toPrimitives()
    });
    const response = await logout(accessToken, {refreshToken: expiredRefreshToken});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid refresh token."');
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('401 Unauthorized, never 500, and no part of the token in the log — a bearer token whose payload is not JSON', async (): Promise<void> => {
    const encodeSegment = (text: string): string => Buffer.from(text).toString('base64url');
    const craftedToken = `${encodeSegment(JSON.stringify({alg: 'HS256', typ: 'JWT'}))}.${encodeSegment('secret-payload-text')}.AAAA`;
    const {refreshToken} = await login();
    const response = await logout(craftedToken, {refreshToken});
    const refreshResponse = await harness.post('/auth/token/refresh', {refreshToken: craftedToken});

    expect([response.status, refreshResponse.status]).toStrictEqual([401, 401]);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid access token."');
    expect(refreshResponse.body).toBe('"Unauthorized. Reason: Invalid refresh token."');
    expect(JSON.stringify(harness.logger.errorList.map((error) => [error.message, error.stack]))).not.toContain('secret-payload-text');
  });

  it('204 for an account that no longer exists: logout loads no account and writes to none', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();

    harness.accountRepository.accountList.splice(0);

    const response = await logout(accessToken, {refreshToken});

    expect(response.status).toBe(204);
    expect(harness.accountRepository.accountList).toStrictEqual([]);
  });

  it('leaves the stored account exactly as it was', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();
    const accountBeforeLogout = harness.accountRepository.accountList[0]?.toPrimitives();

    await logout(accessToken, {refreshToken});

    expect(harness.accountRepository.accountList.map((account) => account.toPrimitives())).toStrictEqual([accountBeforeLogout]);
  });

  it('500 Internal Server Error, Unknown error — the request authenticates and the revocation cannot be stored', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();

    harness.tokenRevocationRepository.writeOutcomeList.push(new Error('the store is down'));

    const response = await logout(accessToken, {refreshToken});

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('500 when only the second revocation cannot be stored, then 204 when the caller repeats the request', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();

    harness.tokenRevocationRepository.writeOutcomeList.push(null, new Error('the store is down'));

    const failedResponse = await logout(accessToken, {refreshToken});
    const repeatedResponse = await logout(accessToken, {refreshToken});

    expect([failedResponse.status, repeatedResponse.status]).toStrictEqual([500, 204]);
    expect(harness.tokenRevocationRepository.revokedTokenList.map((storedRevocation) => storedRevocation.tokenId)).toStrictEqual([readTokenId(refreshToken), readTokenId(accessToken)]);
  });

  it('500 Internal Server Error, Unknown error — the revocations cannot be read, and the request does not pass', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();

    harness.tokenRevocationRepository.nextError = new Error('the store is down');

    const response = await logout(accessToken, {refreshToken});

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });
});
