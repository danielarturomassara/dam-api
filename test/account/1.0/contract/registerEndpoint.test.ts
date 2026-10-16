import {ACCOUNT_REPOSITORY} from '@account/domain/AccountRepository.js';
import {ENCRYPTER} from '@account/domain/Encrypter.js';
import {ModuleRouter} from '@account/infrastructure/http/ModuleRouter.js';
import {HttpRouter} from '@core/domain/HttpRouter.js';
import {LOGGER} from '@core/domain/Logger.js';
import {HttpServerExpress} from '@core/infrastructure/http/HttpServerExpress.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {Router} from 'express';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../../../core/1.0/double/CoreConfigFake.js';
import {LoggerSpy} from '../../../core/1.0/double/LoggerSpy.js';
import {AccountRepositoryInMemory} from '../double/AccountRepositoryInMemory.js';
import {EncrypterFake} from '../double/EncrypterFake.js';

// HTTP contract of spec/approved/account.spec.md §3.3: one case per response-table row, driven through the
// real Express stack (HttpServerExpress middleware chain + the account ModuleRouter + the @core
// error middleware) with the persistence and encryption adapters replaced by doubles.

const TEST_PORT = 43118;

const BASE_URL = `http://127.0.0.1:${TEST_PORT}/auth/register`;

const accountRepository = new AccountRepositoryInMemory();
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

const httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: TEST_PORT}), logger, new AccountOnlyRouter());

interface ContractResponse {
  body: string;
  contentType: string;
  status: number;
}

const post = async (body: string, contentType: string = 'application/json'): Promise<ContractResponse> => {
  const response = await fetch(BASE_URL, {body, headers: {'content-type': contentType}, method: 'POST'});

  return {body: await response.text(), contentType: response.headers.get('content-type') ?? '', status: response.status};
};

const postJson = (body: unknown): Promise<ContractResponse> => post(JSON.stringify(body));

const passwordRegistration = {provider: 'password', providerData: {email: 'someone@example.com', password: 'correct-horse-battery'}};

beforeAll(async (): Promise<void> => {
  await dependencyContainer.unbind(ACCOUNT_REPOSITORY);
  await dependencyContainer.unbind(ENCRYPTER);
  await dependencyContainer.unbind(LOGGER);

  dependencyContainer.bind(ACCOUNT_REPOSITORY).toConstantValue(accountRepository);
  dependencyContainer.bind(ENCRYPTER).toConstantValue(new EncrypterFake());
  dependencyContainer.bind(LOGGER).toConstantValue(logger);

  await httpServer.start();
});

afterAll(async (): Promise<void> => {
  await httpServer.stop();
});

beforeEach((): void => {
  accountRepository.accountList.splice(0);
  logger.warningList.splice(0);
  logger.errorList.splice(0);
});

describe('POST /auth/register contract (spec/approved/account.spec.md §3.3)', (): void => {
  it('202 Accepted, empty body — the account was created', async (): Promise<void> => {
    const response = await postJson(passwordRegistration);

    expect(response).toStrictEqual({body: '', contentType: '', status: 202});
    expect(accountRepository.accountList).toHaveLength(1);
  });

  it('202 Accepted, empty body — the primary contact already belongs to an account (unverified provider)', async (): Promise<void> => {
    await postJson(passwordRegistration);

    const response = await postJson(passwordRegistration);

    expect(response).toStrictEqual({body: '', contentType: '', status: 202});
    expect(accountRepository.accountList).toHaveLength(1);
    expect(logger.warningList).toStrictEqual(['Silenced a duplicate registration attempt (Conflict: email.)']);
  });

  it.each([
    ['a malformed JSON body', '{"provider":', '"Malformed JSON body"'],
    ['a missing provider', '{}', '"provider is required"'],
    ['an unknown provider', '{"provider":"carrier-pigeon","providerData":{}}', '"Unknown provider: carrier-pigeon"'],
    ['a missing field', '{"provider":"password","providerData":{"email":"someone@example.com"}}', '"password is required for password provider"'],
    ['a mistyped field', '{"provider":"phone","providerData":{"phone":34600123456}}', '"phone must be a string for phone provider"'],
    ['a rule failure', '{"provider":"password","providerData":{"email":"someone@example.com","password":"short"}}', '"Password must be at least 8 characters long"'],
    ['a national phone without prefix', '{"provider":"phone","providerData":{"phone":"600123456"}}', '"<Phone> does not allow the value <600123456>"']
  ])('400 Bad Request, JSON string reason — %s', async (_caseName: string, body: string, expectedBody: string): Promise<void> => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(response.contentType).toContain('application/json');
    expect(response.body).toBe(expectedBody);
    expect(accountRepository.accountList).toHaveLength(0);
  });

  it.each([
    ['apple', {code: 'c', id_token: 't', state: 's'}],
    ['google', {access_token: 'a', expires_in: 3600, id_token: 't', scope: 'openid', token_type: 'Bearer'}],
    ['meta', {authResponse: {accessToken: 'a', expiresIn: 3600, userID: 'u'}, status: 'connected'}]
  ])('501 Not Implemented, empty body — the %s flow is not implemented', async (provider: string, providerData: unknown): Promise<void> => {
    const response = await postJson({provider, providerData});

    expect(response).toStrictEqual({body: '', contentType: '', status: 501});
  });

  it('validates the oauth shape before answering 501', async (): Promise<void> => {
    const response = await postJson({provider: 'google', providerData: {access_token: 'a'}});

    expect(response.status).toBe(400);
    expect(response.body).toBe('"expires_in is required for google provider"');
  });

  it('500 Internal Server Error, "Unknown error" — anything the module did not anticipate', async (): Promise<void> => {
    accountRepository.nextCreateError = new Error('the database credentials are wrong');

    const response = await postJson(passwordRegistration);

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
    expect(logger.errorList).toHaveLength(1);
  });

  it('ignores unknown body fields at any depth', async (): Promise<void> => {
    const response = await postJson({...passwordRegistration, isAdmin: true, providerData: {...passwordRegistration.providerData, role: 'root'}});

    expect(response.status).toBe(202);
    expect(accountRepository.accountList[0]?.toPrimitives()).not.toHaveProperty('isAdmin');
  });

  it('answers a non-JSON content type as an invalid body, never with an HTML page', async (): Promise<void> => {
    const response = await post('provider=password', 'text/plain');

    expect(response.status).toBe(400);
    expect(response.contentType).toContain('application/json');
    expect(response.body).toBe('"provider is required"');
  });
});
