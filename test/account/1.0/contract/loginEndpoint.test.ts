import jsonwebtoken from 'jsonwebtoken';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {buildLoginChallenge, buildPasswordLoginAccount, buildPhoneLoginAccount, LOGIN_CODE, LOGIN_PASSWORD, LoginAccountState} from '../double/loginFixtures.js';
import {CONTRACT_API_NAME, CONTRACT_SIGNING_SECRET, LoginContractHarness} from './loginContractHarness.js';

const harness = new LoginContractHarness(43121);

const EMAIL = 'someone@example.com';

const PHONE = '+34600111222';

const passwordLogin = (password: string = LOGIN_PASSWORD, email: string = EMAIL): unknown => ({provider: 'password', providerData: {email, password}});

const readClaims = (token: unknown): jsonwebtoken.JwtPayload => {
  const payload = jsonwebtoken.verify(String(token), CONTRACT_SIGNING_SECRET, {algorithms: ['HS256'], issuer: CONTRACT_API_NAME});

  if (typeof payload === 'string') {
    throw new Error('The token payload is not an object.');
  }

  return payload;
};

beforeAll(async (): Promise<void> => harness.start());

afterAll(async (): Promise<void> => harness.stop());

beforeEach((): void => harness.reset());

describe('POST /auth/login contract (spec/approved/account.spec.md §3.6)', (): void => {
  it('200 OK, both tokens — the password credential is proven and the identity may log in', async (): Promise<void> => {
    const account = buildPasswordLoginAccount(EMAIL);

    await harness.accountRepository.create(account);

    const response = await harness.post('/auth/login', passwordLogin());
    const body = JSON.parse(response.body) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.contentType).toContain('application/json');
    expect(response.cacheControl).toBe('no-store');
    expect(Object.keys(body)).toStrictEqual(['accessToken', 'expiresIn', 'refreshExpiresIn', 'refreshToken', 'tokenType']);
    expect(body).toMatchObject({expiresIn: 900, refreshExpiresIn: 2_592_000, tokenType: 'Bearer'});
    expect(readClaims(body.accessToken)).toMatchObject({sub: account.id.toPrimitives(), token_use: 'access'});
    expect(readClaims(body.refreshToken)).toMatchObject({provider: 'password', sub: account.id.toPrimitives(), token_use: 'refresh'});
  });

  it('200 OK — the phone code is proven and the identity may log in', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE);

    await harness.accountRepository.create(account);
    await harness.loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));

    const response = await harness.post('/auth/login', {provider: 'phone', providerData: {code: LOGIN_CODE, phone: PHONE}});
    const body = JSON.parse(response.body) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(readClaims(body.refreshToken)).toMatchObject({provider: 'phone', sub: account.id.toPrimitives()});
  });

  it.each([
    ['a malformed JSON body', '{"provider":', '"Malformed JSON body"'],
    ['a missing provider', '{}', '"provider is required"'],
    ['an unknown provider', '{"provider":"carrier-pigeon","providerData":{}}', '"Unknown provider: carrier-pigeon"'],
    ['a missing field', '{"provider":"password","providerData":{"email":"someone@example.com"}}', '"password is required for password provider"'],
    ['a mistyped field', '{"provider":"phone","providerData":{"phone":"+34600111222","code":481930}}', '"code must be a string for phone provider"'],
    ['a code that is not digits', '{"provider":"phone","providerData":{"phone":"+34600111222","code":"48a930"}}', '"code must be a string of digits for phone provider"'],
    ['a national phone without prefix', '{"provider":"phone","providerData":{"phone":"600111222","code":"481930"}}', '"<Phone> does not allow the value <600111222>"']
  ])('400 Bad Request, JSON string reason — %s', async (_caseName: string, body: string, expectedBody: string): Promise<void> => {
    const response = await harness.post('/auth/login', body);

    expect(response.status).toBe(400);
    expect(response.contentType).toContain('application/json');
    expect(response.body).toBe(expectedBody);
  });

  it.each([
    ['an unknown email', passwordLogin(LOGIN_PASSWORD, 'nobody@example.com')],
    ['a wrong password', passwordLogin('wrong-horse-battery')],
    ['an unknown phone', {provider: 'phone', providerData: {code: LOGIN_CODE, phone: '+34600999888'}}],
    ['a wrong code against an active challenge', {provider: 'phone', providerData: {code: '000000', phone: PHONE}}]
  ])('401 Unauthorized, the one Invalid credentials message with the Bearer challenge — %s', async (_caseName: string, body: unknown): Promise<void> => {
    const phoneAccount = buildPhoneLoginAccount(PHONE);

    await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));
    await harness.accountRepository.create(phoneAccount);
    await harness.loginChallengeRepository.create(buildLoginChallenge(phoneAccount.id, new Date()));

    const response = await harness.post('/auth/login', body);

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid credentials."');
    expect(response.challenge).toBe('Bearer');
    expect(response.cacheControl).not.toBe('no-store');
  });

  it.each<[LoginAccountState, string]>([
    [{isAccountDisabled: true}, 'account disabled'],
    [{isIdentityDisabled: true}, 'identity disabled'],
    [{isIdentityVerified: false}, 'identity not verified']
  ])('403 Forbidden, "Login not allowed. Reason: <reason>." — proven credential in state %o', async (state: LoginAccountState, expectedReason: string): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL, state));

    const response = await harness.post('/auth/login', passwordLogin());

    expect(response.status).toBe(403);
    expect(response.body).toBe(`"Login not allowed. Reason: ${expectedReason}."`);
  });

  it('429 Too Many Requests with Retry-After — the client address exceeded the throttle, scope login', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));
    harness.requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 17};

    const response = await harness.post('/auth/login', passwordLogin());

    expect(response.status).toBe(429);
    expect(response.body).toBe('"Too many requests."');
    expect(response.retryAfter).toBe('17');
    expect(harness.requestThrottle.consumedList).toStrictEqual([{clientAddress: '127.0.0.1', scope: 'account.login'}]);
    expect(harness.requestThrottle.policyList).toStrictEqual([{maximumRequests: 20, windowSeconds: 300}]);
    expect(harness.encrypter.getComputationCount()).toBe(0);
  });

  it.each([
    ['apple', {code: 'c', id_token: 't', state: 's'}],
    ['google', {access_token: 'a', expires_in: 3600, id_token: 't', scope: 'openid', token_type: 'Bearer'}],
    ['meta', {authResponse: {accessToken: 'a', expiresIn: 3600, userID: 'u'}, status: 'connected'}]
  ])('501 Not Implemented, empty body — the %s flow is not implemented', async (provider: string, providerData: unknown): Promise<void> => {
    const response = await harness.post('/auth/login', {provider, providerData});

    expect(response.status).toBe(501);
    expect(response.body).toBe('');
  });

  it('validates the oauth shape before answering 501', async (): Promise<void> => {
    const response = await harness.post('/auth/login', {provider: 'google', providerData: {access_token: 'a'}});

    expect(response.status).toBe(400);
    expect(response.body).toBe('"expires_in is required for google provider"');
  });

  it('500 Internal Server Error, "Unknown error" — anything the module did not anticipate', async (): Promise<void> => {
    harness.accountRepository.findByEmail = async (): Promise<never> => {
      throw new Error('the database credentials are wrong');
    };

    const response = await harness.post('/auth/login', passwordLogin());

    Reflect.deleteProperty(harness.accountRepository, 'findByEmail');

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
    expect(harness.logger.errorList).toHaveLength(1);
  });

  it('ignores unknown body fields at any depth', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordLoginAccount(EMAIL));

    const response = await harness.post('/auth/login', {isAdmin: true, provider: 'password', providerData: {email: EMAIL, password: LOGIN_PASSWORD, role: 'root'}});

    expect(response.status).toBe(200);
  });
});
