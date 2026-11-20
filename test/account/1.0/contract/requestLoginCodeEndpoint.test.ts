import {LOGIN_CODE_REQUEST_STRATEGY_REGISTRY, LoginCodeRequestStrategyRegistry} from '@account/application/useCase/loginCode/LoginCodeRequestStrategy.js';
import {PhoneLoginCodeRequest} from '@account/application/useCase/loginCode/PhoneLoginCodeRequest.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {AccountConfigFake} from '../double/AccountConfigFake.js';
import {LoginCodeSenderSpy} from '../double/LoginCodeSenderSpy.js';
import {buildLoginChallenge, buildPhoneLoginAccount} from '../double/loginFixtures.js';
import {LoginContractHarness} from './loginContractHarness.js';

const harness = new LoginContractHarness(43123);

const PHONE = '+34600111222';

const phoneRequest = (phone: string = PHONE): unknown => ({provider: 'phone', providerData: {phone}});

beforeAll(async (): Promise<void> => harness.start());

afterAll(async (): Promise<void> => harness.stop());

beforeEach((): void => harness.reset());

describe('POST /auth/login/code contract while delivery is not available (spec/approved/account.spec.md §3.7, §4.11)', (): void => {
  it('501 Not Implemented, empty body — whether or not the phone belongs to an account', async (): Promise<void> => {
    await harness.accountRepository.create(buildPhoneLoginAccount(PHONE));

    const knownPhoneResponse = await harness.post('/auth/login/code', phoneRequest());
    const unknownPhoneResponse = await harness.post('/auth/login/code', phoneRequest('+34600999888'));

    expect(knownPhoneResponse.status).toBe(501);
    expect(knownPhoneResponse.body).toBe('');
    expect(unknownPhoneResponse.status).toBe(501);
    expect(harness.loginChallengeRepository.challengeList).toStrictEqual([]);
  });

  it.each([
    ['a malformed JSON body', '{"provider":', '"Malformed JSON body"'],
    ['a missing provider', '{}', '"provider is required"'],
    ['an unknown provider', '{"provider":"carrier-pigeon","providerData":{}}', '"Unknown provider: carrier-pigeon"'],
    ['a missing field', '{"provider":"phone","providerData":{}}', '"phone is required for phone provider"'],
    ['a national phone without prefix', '{"provider":"phone","providerData":{"phone":"600111222"}}', '"<Phone> does not allow the value <600111222>"'],
    ['a provider that sends no codes', '{"provider":"password","providerData":{"email":"someone@example.com"}}', '"password provider does not send login codes"']
  ])('400 Bad Request, JSON string reason — %s', async (_caseName: string, body: string, expectedBody: string): Promise<void> => {
    const response = await harness.post('/auth/login/code', body);

    expect(response.status).toBe(400);
    expect(response.contentType).toContain('application/json');
    expect(response.body).toBe(expectedBody);
  });

  it('429 Too Many Requests with Retry-After — the client address exceeded the throttle, scope loginCode', async (): Promise<void> => {
    harness.requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 9};

    const response = await harness.post('/auth/login/code', phoneRequest());

    expect(response.status).toBe(429);
    expect(response.body).toBe('"Too many requests."');
    expect(response.retryAfter).toBe('9');
    expect(harness.requestThrottle.consumedList).toStrictEqual([{clientAddress: '127.0.0.1', scope: 'account.loginCode'}]);
  });
});

describe('POST /auth/login/code contract with delivery (spec/approved/account.spec.md §3.7, §4.11)', (): void => {
  const loginCodeSender = new LoginCodeSenderSpy();

  beforeAll(async (): Promise<void> => {
    const registry: LoginCodeRequestStrategyRegistry = {
      [IDENTITY_PROVIDERS.PHONE]: new PhoneLoginCodeRequest(harness.accountRepository, harness.loginChallengeRepository, harness.encrypter, new AccountConfigFake(), loginCodeSender)
    };

    await dependencyContainer.unbind(LOGIN_CODE_REQUEST_STRATEGY_REGISTRY);

    dependencyContainer.bind(LOGIN_CODE_REQUEST_STRATEGY_REGISTRY).toConstantValue(registry);
  });

  beforeEach((): void => {
    loginCodeSender.sentList.splice(0);
    loginCodeSender.nextError = null;
  });

  it('202 Accepted, empty body — a code was sent', async (): Promise<void> => {
    await harness.accountRepository.create(buildPhoneLoginAccount(PHONE));

    const response = await harness.post('/auth/login/code', phoneRequest());

    expect(response).toMatchObject({body: '', contentType: '', status: 202});
    expect(loginCodeSender.sentList).toHaveLength(1);
    expect(harness.logger.warningList).toStrictEqual([]);
  });

  it('202 Accepted, empty body — a code was sent to an unverified phone identity, and logging in with it verifies the identity', async (): Promise<void> => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});

    await harness.accountRepository.create(account);

    const codeResponse = await harness.post('/auth/login/code', phoneRequest());
    const loginResponse = await harness.post('/auth/login', {provider: 'phone', providerData: {code: loginCodeSender.sentList[0]?.code, phone: PHONE}});

    expect(codeResponse).toMatchObject({body: '', contentType: '', status: 202});
    expect(harness.logger.warningList).toStrictEqual([]);
    expect(loginResponse.status).toBe(200);
    expect(account.getIdentities()[0]?.isVerified()).toBe(true);
  });

  it('then logs in with the code that was sent', async (): Promise<void> => {
    await harness.accountRepository.create(buildPhoneLoginAccount(PHONE));
    await harness.post('/auth/login/code', phoneRequest());

    const response = await harness.post('/auth/login', {provider: 'phone', providerData: {code: loginCodeSender.sentList[0]?.code, phone: PHONE}});

    expect(response.status).toBe(200);
  });

  it.each<[string, () => Promise<void>, string]>([
    ['the phone belongs to no account', async (): Promise<void> => undefined, 'Silenced a login code request (Account not found.)'],
    [
      'the identity may not be sent a code',
      async (): Promise<void> => harness.accountRepository.create(buildPhoneLoginAccount(PHONE, {isIdentityDisabled: true})),
      'Silenced a login code request (Login not allowed. Reason: identity disabled.)'
    ],
    [
      'a code was requested less than the resend interval ago',
      async (): Promise<void> => {
        const account = buildPhoneLoginAccount(PHONE);

        await harness.accountRepository.create(account);
        await harness.loginChallengeRepository.create(buildLoginChallenge(account.id, new Date()));
      },
      'Silenced a login code request (Too many requests.)'
    ]
  ])('202 Accepted, empty body, silenced with a warning — %s', async (_caseName: string, arrange: () => Promise<void>, expectedWarning: string): Promise<void> => {
    await arrange();

    const response = await harness.post('/auth/login/code', phoneRequest());

    expect(response).toMatchObject({body: '', contentType: '', status: 202});
    expect(loginCodeSender.sentList).toStrictEqual([]);
    expect(harness.logger.warningList).toStrictEqual([expectedWarning]);
  });

  it('500 Internal Server Error, "Unknown error" — delivery fails, and the failure is not silenced', async (): Promise<void> => {
    await harness.accountRepository.create(buildPhoneLoginAccount(PHONE));
    loginCodeSender.nextError = new Error('the provider is unreachable');

    const response = await harness.post('/auth/login/code', phoneRequest());

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
    expect(harness.logger.warningList).toStrictEqual([]);
  });

  it('never silences the 429 of the throttle', async (): Promise<void> => {
    harness.requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 9};

    const response = await harness.post('/auth/login/code', phoneRequest());

    expect(response.status).toBe(429);
    expect(harness.logger.warningList).toStrictEqual([]);
  });
});
