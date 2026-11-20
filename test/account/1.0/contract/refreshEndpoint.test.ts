import {Account} from '@account/domain/entity/Account.js';
import jsonwebtoken from 'jsonwebtoken';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {buildPasswordLoginAccount, LOGIN_PASSWORD} from '../double/loginFixtures.js';
import {CONTRACT_API_NAME, CONTRACT_SIGNING_SECRET, LoginContractHarness} from './loginContractHarness.js';

const harness = new LoginContractHarness(43122);

const EMAIL = 'someone@example.com';

const login = async (): Promise<{accessToken: string; refreshToken: string}> => {
  const response = await harness.post('/auth/login', {provider: 'password', providerData: {email: EMAIL, password: LOGIN_PASSWORD}});

  return JSON.parse(response.body) as {accessToken: string; refreshToken: string};
};

beforeAll(async (): Promise<void> => harness.start());

afterAll(async (): Promise<void> => harness.stop());

beforeEach((): void => harness.reset());

describe('POST /auth/token/refresh contract (spec/approved/account.spec.md §3.8)', (): void => {
  it('200 OK, a new access token and no refresh token — the refresh token is valid', async (): Promise<void> => {
    const account = buildPasswordLoginAccount(EMAIL);

    await harness.accountRepository.create(account);

    const {refreshToken} = await login();
    const response = await harness.post('/auth/token/refresh', {refreshToken});
    const body = JSON.parse(response.body) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.cacheControl).toBe('no-store');
    expect(Object.keys(body)).toStrictEqual(['accessToken', 'expiresIn', 'tokenType']);
    expect(body).toMatchObject({expiresIn: 900, tokenType: 'Bearer'});
    expect(jsonwebtoken.verify(String(body.accessToken), CONTRACT_SIGNING_SECRET, {algorithms: ['HS256'], issuer: CONTRACT_API_NAME})).toMatchObject({sub: account.id.toPrimitives(), token_use: 'access'});
  });

  it('is not throttled', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));

    const {refreshToken} = await login();

    harness.requestThrottle.consumedList.splice(0);
    harness.requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 17};

    const response = await harness.post('/auth/token/refresh', {refreshToken});

    expect(response.status).toBe(200);
    expect(harness.requestThrottle.consumedList).toStrictEqual([]);
  });

  it.each([
    ['a malformed JSON body', '{"refreshToken":', '"Malformed JSON body"'],
    ['a missing refreshToken', '{}', '"refreshToken is required"'],
    ['a refreshToken that is not a string', '{"refreshToken":7}', '"refreshToken must be a string"']
  ])('400 Bad Request, JSON string reason — %s', async (_caseName: string, body: string, expectedBody: string): Promise<void> => {
    const response = await harness.post('/auth/token/refresh', body);

    expect(response.status).toBe(400);
    expect(response.body).toBe(expectedBody);
  });

  it('401 Unauthorized with the Bearer challenge — an access token presented as a refresh token', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));

    const {accessToken} = await login();
    const response = await harness.post('/auth/token/refresh', {refreshToken: accessToken});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid refresh token."');
    expect(response.challenge).toBe('Bearer');
  });

  it('401 Unauthorized — text that is not a token', async (): Promise<void> => {
    const response = await harness.post('/auth/token/refresh', {refreshToken: 'not-a-token'});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid refresh token."');
  });

  it('401 Unauthorized — the account of the token no longer exists', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));

    const {refreshToken} = await login();

    harness.accountRepository.accountList.splice(0);

    const response = await harness.post('/auth/token/refresh', {refreshToken});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid refresh token."');
  });

  it('403 Forbidden — the token is valid and the account has been disabled since', async (): Promise<void> => {
    const account = buildPasswordLoginAccount(EMAIL);

    await harness.accountRepository.create(account);

    const {refreshToken} = await login();

    harness.accountRepository.accountList.splice(0);
    harness.accountRepository.accountList.push(Account.fromPrimitives({...account.toPrimitives(), disabledAt: new Date()}));

    const response = await harness.post('/auth/token/refresh', {refreshToken});

    expect(response.status).toBe(403);
    expect(response.body).toBe('"Login not allowed. Reason: account disabled."');
  });

  it('500 Internal Server Error, "Unknown error" — anything the module did not anticipate', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));

    const {refreshToken} = await login();

    harness.accountRepository.findById = async (): Promise<never> => {
      throw new Error('the database credentials are wrong');
    };

    const response = await harness.post('/auth/token/refresh', {refreshToken});

    Reflect.deleteProperty(harness.accountRepository, 'findById');

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
  });
});
