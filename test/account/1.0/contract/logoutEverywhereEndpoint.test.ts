import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

import {buildPasswordLoginAccount, LOGIN_PASSWORD} from '../double/loginFixtures.js';
import {ContractResponse, LoginContractHarness} from './loginContractHarness.js';
import {postWithHeaders} from './postWithHeaders.js';

const PORT = 43128;

const harness = new LoginContractHarness(PORT);

const EMAIL = 'someone@example.com';

const OTHER_EMAIL = 'someone-else@example.com';

const NOW = new Date('2026-03-01T10:00:00.000Z');

interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

const login = async (email: string = EMAIL): Promise<LoginTokens> => {
  const response = await harness.post('/auth/login', {provider: 'password', providerData: {email, password: LOGIN_PASSWORD}});

  return JSON.parse(response.body) as LoginTokens;
};

const logoutEverywhere = async (accessToken: string, body?: unknown): Promise<ContractResponse> => {
  return postWithHeaders(PORT, '/auth/logout/all', {authorization: `Bearer ${accessToken}`}, body);
};

const refresh = async (refreshToken: string): Promise<ContractResponse> => harness.post('/auth/token/refresh', {refreshToken});

beforeAll(async (): Promise<void> => harness.start());

afterAll(async (): Promise<void> => harness.stop());

beforeEach(async (): Promise<void> => {
  vi.useFakeTimers({toFake: ['Date']});
  vi.setSystemTime(NOW);
  harness.reset();
  harness.tokenRevocationRepository.writeOutcomeList.splice(0);

  await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('POST /auth/logout/all contract (spec/approved/account.spec.md §3.12)', (): void => {
  it('204 No Content, empty body — the instant of the request becomes the cutoff of the account for one refresh token lifetime', async (): Promise<void> => {
    const {accessToken} = await login();

    vi.setSystemTime(new Date(NOW.getTime() + 5000));

    const response = await logoutEverywhere(accessToken);
    const account = harness.accountRepository.accountList[0];

    expect(response.status).toBe(204);
    expect(response.body).toBe('');
    expect(harness.tokenRevocationRepository.cutoffList).toStrictEqual([
      {accountId: account?.id.toPrimitives(), expiresAt: new Date(NOW.getTime() + 5000 + 2_592_000_000), issuedUntil: new Date(NOW.getTime() + 5000)}
    ]);
    expect(harness.tokenRevocationRepository.revokedTokenList).toStrictEqual([]);
  });

  it('ends every login of the account: no refresh token is exchanged and no access token authenticates, the one of the request included', async (): Promise<void> => {
    const firstLogin = await login();
    const secondLogin = await login();

    await logoutEverywhere(firstLogin.accessToken);

    const firstRefreshResponse = await refresh(firstLogin.refreshToken);
    const secondRefreshResponse = await refresh(secondLogin.refreshToken);
    const sameTokenResponse = await logoutEverywhere(firstLogin.accessToken);
    const otherTokenResponse = await logoutEverywhere(secondLogin.accessToken);

    expect([firstRefreshResponse.status, secondRefreshResponse.status]).toStrictEqual([401, 401]);
    expect(firstRefreshResponse.body).toBe('"Unauthorized. Reason: Invalid refresh token."');
    expect([sameTokenResponse.status, otherTokenResponse.status]).toStrictEqual([401, 401]);
    expect(sameTokenResponse.body).toBe('"Unauthorized. Reason: Invalid access token."');
  });

  it('revokes a token issued in the same second as the request', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();

    vi.setSystemTime(new Date(NOW.getTime() + 900));
    await logoutEverywhere(accessToken);

    const sameSecondLogin = await login();
    const earlierRefreshResponse = await refresh(refreshToken);
    const sameSecondRefreshResponse = await refresh(sameSecondLogin.refreshToken);

    expect([earlierRefreshResponse.status, sameSecondRefreshResponse.status]).toStrictEqual([401, 401]);
  });

  it('does not revoke what is issued afterwards: logging in again works', async (): Promise<void> => {
    const {accessToken} = await login();

    await logoutEverywhere(accessToken);

    vi.setSystemTime(new Date(NOW.getTime() + 1000));

    const laterLogin = await login();
    const refreshResponse = await refresh(laterLogin.refreshToken);
    const logoutResponse = await logoutEverywhere(laterLogin.accessToken);

    expect(refreshResponse.status).toBe(200);
    expect(logoutResponse.status).toBe(204);
  });

  it('leaves the logins of every other account alone', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(OTHER_EMAIL));

    const {accessToken} = await login();
    const otherLogin = await login(OTHER_EMAIL);

    await logoutEverywhere(accessToken);

    const refreshResponse = await refresh(otherLogin.refreshToken);

    expect(refreshResponse.status).toBe(200);
  });

  it('takes no body and ignores one', async (): Promise<void> => {
    const {accessToken} = await login();
    const response = await logoutEverywhere(accessToken, {refreshToken: 7});

    expect(response.status).toBe(204);
  });

  it('is not throttled', async (): Promise<void> => {
    const {accessToken} = await login();

    harness.requestThrottle.consumedList.splice(0);
    harness.requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 17};

    const response = await logoutEverywhere(accessToken);

    expect(response.status).toBe(204);
    expect(harness.requestThrottle.consumedList).toStrictEqual([]);
  });

  it.each([
    ['no Authorization header', {}],
    ['another scheme', {authorization: 'Basic abc123'}]
  ])('401 Unauthorized with the Bearer challenge, Missing access token — %s', async (_caseName: string, headers: Record<string, string>): Promise<void> => {
    const response = await postWithHeaders(PORT, '/auth/logout/all', headers);

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Missing access token."');
    expect(response.challenge).toBe('Bearer');
    expect(harness.tokenRevocationRepository.cutoffList).toStrictEqual([]);
  });

  it.each<[string, (tokens: LoginTokens) => string]>([
    ['text that is not a token', (): string => 'not-a-token'],
    ['a refresh token presented as an access token', (tokens: LoginTokens): string => tokens.refreshToken]
  ])('401 Unauthorized with the Bearer challenge, Invalid access token — %s', async (_caseName: string, buildAccessToken: (tokens: LoginTokens) => string): Promise<void> => {
    const tokens = await login();
    const response = await logoutEverywhere(buildAccessToken(tokens));

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid access token."');
    expect(response.challenge).toBe('Bearer');
    expect(harness.tokenRevocationRepository.cutoffList).toStrictEqual([]);
  });

  it('401 Unauthorized, Invalid access token — an access token revoked by a logout', async (): Promise<void> => {
    const {accessToken, refreshToken} = await login();

    await postWithHeaders(PORT, '/auth/logout', {authorization: `Bearer ${accessToken}`}, {refreshToken});

    const response = await logoutEverywhere(accessToken);

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid access token."');
    expect(harness.tokenRevocationRepository.cutoffList).toStrictEqual([]);
  });

  it('204 for an account that no longer exists, and the stored accounts stay exactly as they were', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(OTHER_EMAIL));

    const {accessToken} = await login();

    harness.accountRepository.accountList.splice(0, 1);

    const accountListBeforeLogout = harness.accountRepository.accountList.map((account) => account.toPrimitives());
    const response = await logoutEverywhere(accessToken);

    expect(response.status).toBe(204);
    expect(harness.accountRepository.accountList.map((account) => account.toPrimitives())).toStrictEqual(accountListBeforeLogout);
  });

  it('500 Internal Server Error, Unknown error — the request authenticates and the revocation cannot be stored', async (): Promise<void> => {
    const {accessToken} = await login();

    harness.tokenRevocationRepository.writeOutcomeList.push(new Error('the store is down'));

    const failedResponse = await logoutEverywhere(accessToken);
    const repeatedResponse = await logoutEverywhere(accessToken);

    expect([failedResponse.status, repeatedResponse.status]).toStrictEqual([500, 204]);
    expect(failedResponse.body).toBe('"Unknown error"');
  });

  it('500 Internal Server Error, Unknown error — the revocations cannot be read', async (): Promise<void> => {
    const {accessToken} = await login();

    harness.tokenRevocationRepository.nextError = new Error('the store is down');

    const response = await logoutEverywhere(accessToken);

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
    expect(harness.tokenRevocationRepository.cutoffList).toStrictEqual([]);
  });
});
