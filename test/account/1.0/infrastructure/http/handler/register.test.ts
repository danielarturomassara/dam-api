import {ACCOUNT_REPOSITORY} from '@account/domain/AccountRepository.js';
import {ENCRYPTER} from '@account/domain/Encrypter.js';
import register from '@account/infrastructure/http/handler/register.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {LOGGER} from '@core/domain/Logger.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {Request, Response} from 'express';
import {beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {LoggerSpy} from '../../../../../core/1.0/double/LoggerSpy.js';
import {ResponseRecorder} from '../../../../../core/1.0/double/ResponseRecorder.js';
import {AccountRepositoryInMemory} from '../../../double/AccountRepositoryInMemory.js';
import {EncrypterFake} from '../../../double/EncrypterFake.js';

// Pins spec/approved/account.spec.md §3.3 response table and §5: the handler answers 202 on success, silences
// only DuplicateContact into a 202, and forwards every other error to the error middleware.

// The strategies are singletons that capture the repository once, so one in-memory repository and
// one logger serve the whole file and are emptied between tests.
const accountRepository = new AccountRepositoryInMemory();
const logger = new LoggerSpy();

beforeAll(async (): Promise<void> => {
  await dependencyContainer.unbind(ACCOUNT_REPOSITORY);
  await dependencyContainer.unbind(ENCRYPTER);
  await dependencyContainer.unbind(LOGGER);

  dependencyContainer.bind(ACCOUNT_REPOSITORY).toConstantValue(accountRepository);
  dependencyContainer.bind(ENCRYPTER).toConstantValue(new EncrypterFake());
  dependencyContainer.bind(LOGGER).toConstantValue(logger);
});

beforeEach((): void => {
  accountRepository.accountList.splice(0);
  logger.warningList.splice(0);
});

const handle = async (body: unknown): Promise<{forwardedError: unknown; response: ResponseRecorder}> => {
  const response = new ResponseRecorder();
  let forwardedError: unknown = null;

  await register({body} as Request, response as unknown as Response, (error: unknown): void => {
    forwardedError = error;
  });

  return {forwardedError, response};
};

describe('register handler', (): void => {
  it('answers 202 with an empty body when the account is created', async (): Promise<void> => {
    const {forwardedError, response} = await handle({provider: 'password', providerData: {email: 'someone@example.com', password: 'correct-horse-battery'}});

    expect(forwardedError).toBeNull();
    expect(response.statusCode).toBe(202);
    expect(response.isEnded).toBe(true);
    expect(response.jsonBody).toBeUndefined();
    expect(accountRepository.accountList).toHaveLength(1);
  });

  it('silences a duplicate contact into the same 202, logging a warning', async (): Promise<void> => {
    const body = {provider: 'password', providerData: {email: 'someone@example.com', password: 'correct-horse-battery'}};

    await handle(body);

    const {forwardedError, response} = await handle(body);

    expect(forwardedError).toBeNull();
    expect(response.statusCode).toBe(202);
    expect(response.jsonBody).toBeUndefined();
    expect(logger.warningList).toStrictEqual(['Silenced a duplicate registration attempt (Conflict: email.)']);
    expect(accountRepository.accountList).toHaveLength(1);
  });

  it('forwards a validation failure to the error middleware', async (): Promise<void> => {
    const {forwardedError, response} = await handle({provider: 'password', providerData: {email: 'someone@example.com'}});

    expect(forwardedError).toBeInstanceOf(InvalidArgument);
    expect(response.isEnded).toBe(false);
  });

  it('forwards a Conflict that is not a DuplicateContact instead of silencing it', async (): Promise<void> => {
    accountRepository.nextCreateError = new Conflict('something else');

    const {forwardedError, response} = await handle({provider: 'phone', providerData: {phone: '+34600123456'}});

    expect(forwardedError).toBeInstanceOf(Conflict);
    expect(response.isEnded).toBe(false);
    expect(logger.warningList).toStrictEqual([]);
  });

  it('forwards a not-implemented provider to the error middleware', async (): Promise<void> => {
    const {forwardedError} = await handle({provider: 'google', providerData: {access_token: 'a', expires_in: 1, id_token: 't', scope: 's', token_type: 'Bearer'}});

    expect(forwardedError).toBeInstanceOf(NotImplemented);
  });
});
