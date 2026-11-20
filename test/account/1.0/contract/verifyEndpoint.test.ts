import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {buildGoogleOnlyAccount, LOGIN_PASSWORD} from '../double/loginFixtures.js';
import {buildPasswordVerificationAccount, VERIFICATION_HASH, VERIFICATION_LIFETIME_MILLISECONDS} from '../double/verificationFixtures.js';
import {LoginContractHarness} from './loginContractHarness.js';

const harness = new LoginContractHarness(43125);

const EMAIL = 'someone@example.com';

const NOT_PROVEN_BODY = '"Invalid or expired verification"';

const verifyRequest = (hash: string = VERIFICATION_HASH, email: string = EMAIL): unknown => ({provider: 'password', providerData: {email, hash}});

beforeAll(async (): Promise<void> => harness.start());

afterAll(async (): Promise<void> => harness.stop());

beforeEach((): void => harness.reset());

describe('POST /auth/verify contract (spec/approved/account.spec.md §3.10)', (): void => {
  it('204 No Content, empty body — the identity was verified', async (): Promise<void> => {
    const account = buildPasswordVerificationAccount(EMAIL);

    await harness.accountRepository.create(account);

    const response = await harness.post('/auth/verify', verifyRequest());

    expect(response).toMatchObject({body: '', contentType: '', status: 204});
    expect(account.getIdentities()[0]?.isVerified()).toBe(true);
  });

  it('issues no token, and the verified identity logs in afterwards', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordVerificationAccount(EMAIL));

    const login = async (): Promise<number> => (await harness.post('/auth/login', {provider: 'password', providerData: {email: EMAIL, password: LOGIN_PASSWORD}})).status;
    const statusBeforeVerification = await login();
    const verifyResponse = await harness.post('/auth/verify', verifyRequest());
    const statusAfterVerification = await login();

    expect(statusBeforeVerification).toBe(403);
    expect(verifyResponse.body).toBe('');
    expect(verifyResponse.cacheControl).not.toBe('no-store');
    expect(statusAfterVerification).toBe(200);
  });

  it('ignores unknown body fields and lowercases the email', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordVerificationAccount(EMAIL));

    const response = await harness.post('/auth/verify', {extra: true, provider: 'password', providerData: {email: 'Someone@Example.com', extra: 1, hash: VERIFICATION_HASH}});

    expect(response.status).toBe(204);
  });

  it.each<[string, () => Promise<void>, string]>([
    ['an unknown email', async (): Promise<void> => undefined, VERIFICATION_HASH],
    ['an account without a password identity', async (): Promise<void> => harness.accountRepository.create(buildGoogleOnlyAccount(EMAIL)), VERIFICATION_HASH],
    ['a wrong hash', async (): Promise<void> => harness.accountRepository.create(buildPasswordVerificationAccount(EMAIL)), 'wrong-hash'],
    ['an identity already verified', async (): Promise<void> => harness.accountRepository.create(buildPasswordVerificationAccount(EMAIL, {isIdentityVerified: true})), VERIFICATION_HASH],
    [
      'an identity older than 24 hours',
      async (): Promise<void> => harness.accountRepository.create(buildPasswordVerificationAccount(EMAIL, {identityCreatedAt: new Date(Date.now() - VERIFICATION_LIFETIME_MILLISECONDS)})),
      VERIFICATION_HASH
    ]
  ])('400 Bad Request, "Invalid or expired verification" — %s', async (_caseName: string, arrange: () => Promise<void>, hash: string): Promise<void> => {
    await arrange();

    const response = await harness.post('/auth/verify', verifyRequest(hash));

    expect(response.status).toBe(400);
    expect(response.contentType).toContain('application/json');
    expect(response.body).toBe(NOT_PROVEN_BODY);
    expect(harness.logger.warningList).toStrictEqual([]);
  });

  it('400 Bad Request, the same message — the second submission of the right hash', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordVerificationAccount(EMAIL));

    const firstResponse = await harness.post('/auth/verify', verifyRequest());
    const secondResponse = await harness.post('/auth/verify', verifyRequest());

    expect(firstResponse.status).toBe(204);
    expect(secondResponse.status).toBe(400);
    expect(secondResponse.body).toBe(NOT_PROVEN_BODY);
  });

  it.each([
    ['a malformed JSON body', '{"provider":', '"Malformed JSON body"'],
    ['a missing provider', '{}', '"provider is required"'],
    ['an unknown provider', '{"provider":"carrier-pigeon","providerData":{}}', '"Unknown provider: carrier-pigeon"'],
    ['a missing field', '{"provider":"password","providerData":{"email":"someone@example.com"}}', '"hash is required for password provider"'],
    ['a mistyped field', '{"provider":"password","providerData":{"email":7,"hash":"h"}}', '"email must be a string for password provider"'],
    ['a malformed email', '{"provider":"password","providerData":{"email":"not-an-email","hash":"h"}}', '"<Email> does not allow the value <not-an-email>"'],
    ['a provider that has no verification step', '{"provider":"phone","providerData":{"phone":"+34600111222"}}', '"phone provider has no verification step"']
  ])('400 Bad Request, JSON string reason — %s', async (_caseName: string, body: string, expectedBody: string): Promise<void> => {
    const response = await harness.post('/auth/verify', body);

    expect(response.status).toBe(400);
    expect(response.contentType).toContain('application/json');
    expect(response.body).toBe(expectedBody);
  });

  it('429 Too Many Requests with Retry-After — the client address exceeded the throttle, scope verify', async (): Promise<void> => {
    const account = buildPasswordVerificationAccount(EMAIL);

    await harness.accountRepository.create(account);
    harness.requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 17};

    const response = await harness.post('/auth/verify', verifyRequest());

    expect(response.status).toBe(429);
    expect(response.body).toBe('"Too many requests."');
    expect(response.retryAfter).toBe('17');
    expect(harness.requestThrottle.consumedList).toStrictEqual([{clientAddress: '127.0.0.1', scope: 'account.verify'}]);
    expect(harness.requestThrottle.policyList).toStrictEqual([{maximumRequests: 20, windowSeconds: 300}]);
    expect(account.getIdentities()[0]?.isVerified()).toBe(false);
  });

  it('counts a request against the throttle before validating its body', async (): Promise<void> => {
    await harness.post('/auth/verify', '{}');

    expect(harness.requestThrottle.consumedList).toStrictEqual([{clientAddress: '127.0.0.1', scope: 'account.verify'}]);
  });

  it('500 Internal Server Error, "Unknown error" — the account cannot be persisted', async (): Promise<void> => {
    await harness.accountRepository.create(buildPasswordVerificationAccount(EMAIL));
    harness.accountRepository.update = async (): Promise<void> => {
      throw new Error('the database is unreachable');
    };

    try {
      const response = await harness.post('/auth/verify', verifyRequest());

      expect(response.status).toBe(500);
      expect(response.body).toBe('"Unknown error"');
    } finally {
      Reflect.deleteProperty(harness.accountRepository, 'update');
    }
  });
});
