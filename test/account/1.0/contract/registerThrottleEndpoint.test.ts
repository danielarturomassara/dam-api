import {ACCOUNT_CONFIG} from '@account/domain/AccountConfig.js';
import {ACCOUNT_REPOSITORY} from '@account/domain/AccountRepository.js';
import {ENCRYPTER} from '@account/domain/Encrypter.js';
import {ModuleRouter} from '@account/infrastructure/http/ModuleRouter.js';
import {HttpRouter} from '@core/domain/HttpRouter.js';
import {LOGGER} from '@core/domain/Logger.js';
import {REQUEST_THROTTLE} from '@core/domain/RequestThrottle.js';
import {HttpServerExpress} from '@core/infrastructure/http/HttpServerExpress.js';
import {RequestThrottleInMemory} from '@core/infrastructure/RequestThrottleInMemory.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {Router} from 'express';
import {afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../../../core/1.0/double/CoreConfigFake.js';
import {LoggerSpy} from '../../../core/1.0/double/LoggerSpy.js';
import {AccountConfigFake} from '../double/AccountConfigFake.js';
import {AccountRepositoryInMemory} from '../double/AccountRepositoryInMemory.js';
import {EncrypterFake} from '../double/EncrypterFake.js';

const TEST_PORT = 43120;

const BASE_URL = `http://127.0.0.1:${TEST_PORT}/auth/register`;

const MAXIMUM_REQUESTS = 2;

const WINDOW_SECONDS = 300;

const accountRepository = new AccountRepositoryInMemory();
const encrypter = new EncrypterFake();
const logger = new LoggerSpy();

class AccountOnlyRouter implements HttpRouter {
  public getBasePath (): string {
    return '/';
  }

  public async registerRoutes (): Promise<Router> {
    const moduleRouter = new ModuleRouter(new CoreConfigFake(), logger);
    const router = Router();

    router.use(moduleRouter.getBasePath(), await moduleRouter.registerRoutes());

    return router;
  }
}

let httpServer: HttpServerExpress;

interface ContractResponse {
  body: string;
  retryAfter: null | string;
  status: number;
}

const post = async (body: string): Promise<ContractResponse> => {
  const response = await fetch(BASE_URL, {body, headers: {'connection': 'close', 'content-type': 'application/json'}, method: 'POST'});

  return {body: await response.text(), retryAfter: response.headers.get('retry-after'), status: response.status};
};

const registrationOf = (email: string): string => JSON.stringify({provider: 'password', providerData: {email, password: 'correct-horse-battery'}});

beforeAll(async (): Promise<void> => {
  await dependencyContainer.unbind(ACCOUNT_CONFIG);
  await dependencyContainer.unbind(ACCOUNT_REPOSITORY);
  await dependencyContainer.unbind(ENCRYPTER);
  await dependencyContainer.unbind(LOGGER);

  dependencyContainer.bind(ACCOUNT_CONFIG).toConstantValue(new AccountConfigFake({}, 6, {maximumRequests: MAXIMUM_REQUESTS, windowSeconds: WINDOW_SECONDS}));
  dependencyContainer.bind(ACCOUNT_REPOSITORY).toConstantValue(accountRepository);
  dependencyContainer.bind(ENCRYPTER).toConstantValue(encrypter);
  dependencyContainer.bind(LOGGER).toConstantValue(logger);
});

beforeEach(async (): Promise<void> => {
  accountRepository.accountList.splice(0);

  await dependencyContainer.unbind(REQUEST_THROTTLE);

  dependencyContainer.bind(REQUEST_THROTTLE).toConstantValue(new RequestThrottleInMemory());

  httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: TEST_PORT}), logger, new AccountOnlyRouter());

  await httpServer.start();
});

afterEach(async (): Promise<void> => {
  await httpServer.stop();
});

describe('POST /auth/register throttle (spec/approved/account.spec.md §3.3, §4.7)', (): void => {
  it('429 Too Many Requests, "Too many requests." with Retry-After — the client address exceeded the throttle', async (): Promise<void> => {
    await post(registrationOf('first@example.com'));
    await post(registrationOf('second@example.com'));

    const response = await post(registrationOf('third@example.com'));

    expect(response.status).toBe(429);
    expect(response.body).toBe('"Too many requests."');
    expect(Number(response.retryAfter)).toBeGreaterThanOrEqual(1);
    expect(Number(response.retryAfter)).toBeLessThanOrEqual(WINDOW_SECONDS);
  });

  it('does nothing else for a throttled request: no validation, no account', async (): Promise<void> => {
    await post(registrationOf('first@example.com'));
    await post(registrationOf('second@example.com'));

    const throttledValid = await post(registrationOf('third@example.com'));
    const throttledInvalid = await post('{}');

    expect(throttledValid.status).toBe(429);
    expect(throttledInvalid.status).toBe(429);
    expect(accountRepository.accountList).toHaveLength(MAXIMUM_REQUESTS);
  });

  it('counts every request that reaches the endpoint, whatever its outcome', async (): Promise<void> => {
    expect((await post('{}')).status).toBe(400);
    expect((await post(registrationOf('first@example.com'))).status).toBe(202);
    expect((await post(registrationOf('second@example.com'))).status).toBe(429);
  });

  it('does not count a body the server rejects before routing it', async (): Promise<void> => {
    expect((await post('{"provider":')).status).toBe(400);
    expect((await post('{"provider":')).status).toBe(400);
    expect((await post('{"provider":')).status).toBe(400);
    expect((await post(registrationOf('first@example.com'))).status).toBe(202);
  });

  it('answers the same for a throttled duplicate as for a throttled new contact', async (): Promise<void> => {
    await post(registrationOf('first@example.com'));
    await post(registrationOf('first@example.com'));

    const throttledDuplicate = await post(registrationOf('first@example.com'));

    expect(throttledDuplicate.status).toBe(429);
    expect(throttledDuplicate.body).toBe('"Too many requests."');
  });
});
