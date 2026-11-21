import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {HttpRouter} from '@core/domain/HttpRouter.js';
import {getAuthentication} from '@core/infrastructure/http/getAuthentication.js';
import {HttpServerExpress} from '@core/infrastructure/http/HttpServerExpress.js';
import {authenticate} from '@core/infrastructure/http/middleware/authenticate.js';
import {Router} from 'express';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {AccessTokenAuthenticatorScripted} from '../../double/AccessTokenAuthenticatorScripted.js';
import {CoreConfigFake} from '../../double/CoreConfigFake.js';
import {LoggerSpy} from '../../double/LoggerSpy.js';

const TEST_PORT = 43126;

const accessTokenAuthenticator = new AccessTokenAuthenticatorScripted();

const logger = new LoggerSpy();

let protectedHandlerCallCount = 0;

class ProtectedRouter implements HttpRouter {
  public getBasePath (): string {
    return '/';
  }

  public async registerRoutes (): Promise<Router> {
    const router = Router();

    router.post('/protected', authenticate(accessTokenAuthenticator), (_request, response): void => {
      protectedHandlerCallCount += 1;

      response.status(200).json(getAuthentication(response).subjectId.toPrimitives());
    });
    router.post('/unprotected', (_request, response): void => {
      response.status(200).json(getAuthentication(response).subjectId.toPrimitives());
    });

    return router;
  }
}

const httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: TEST_PORT}), logger, new ProtectedRouter());

interface EndpointResponse {
  body: string;
  challenge: null | string;
  status: number;
}

const post = async (path: string, headers: Record<string, string>, body: string = '{}'): Promise<EndpointResponse> => {
  const response = await fetch(`http://127.0.0.1:${TEST_PORT}${path}`, {body, headers: {'content-type': 'application/json', ...headers}, method: 'POST'});

  return {body: await response.text(), challenge: response.headers.get('www-authenticate'), status: response.status};
};

beforeAll(async (): Promise<void> => httpServer.start());

afterAll(async (): Promise<void> => httpServer.stop());

beforeEach((): void => {
  accessTokenAuthenticator.nextError = null;
  accessTokenAuthenticator.receivedTokenList.splice(0);
  logger.errorList.splice(0);
  protectedHandlerCallCount = 0;
});

describe('a protected endpoint on the real stack (spec/approved/core.spec.md §4.9)', (): void => {
  it('runs the handler with the authentication of the bearer token', async (): Promise<void> => {
    const response = await post('/protected', {authorization: 'Bearer header.payload.signature'});

    expect(response.status).toBe(200);
    expect(response.body).toBe(JSON.stringify(accessTokenAuthenticator.nextAuthentication.subjectId.toPrimitives()));
    expect(accessTokenAuthenticator.receivedTokenList).toStrictEqual(['header.payload.signature']);
  });

  it.each([
    ['no Authorization header', {}],
    ['another scheme', {authorization: 'Basic abc123'}]
  ])('401 with the Bearer challenge and Missing access token — %s', async (_caseName: string, headers: Record<string, string>): Promise<void> => {
    const response = await post('/protected', headers);

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Missing access token."');
    expect(response.challenge).toBe('Bearer');
    expect(protectedHandlerCallCount).toBe(0);
    expect(accessTokenAuthenticator.receivedTokenList).toStrictEqual([]);
  });

  it('answers with the error the authenticator threw and never runs the handler', async (): Promise<void> => {
    accessTokenAuthenticator.nextError = new Unauthorized('Invalid access token');

    const response = await post('/protected', {authorization: 'Bearer header.payload.signature'});

    expect(response.status).toBe(401);
    expect(response.body).toBe('"Unauthorized. Reason: Invalid access token."');
    expect(response.challenge).toBe('Bearer');
    expect(protectedHandlerCallCount).toBe(0);
  });

  it('500 and no handler when the authenticator could not answer', async (): Promise<void> => {
    accessTokenAuthenticator.nextError = new Error('the store is down');

    const response = await post('/protected', {authorization: 'Bearer header.payload.signature'});

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
    expect(protectedHandlerCallCount).toBe(0);
  });

  it('never logs the token', async (): Promise<void> => {
    accessTokenAuthenticator.nextError = new Unauthorized('Invalid access token');

    await post('/protected', {authorization: 'Bearer secret-token-value'});

    expect(logger.errorList).toHaveLength(1);
    expect(JSON.stringify(logger.errorList.map((error) => [error.message, error.stack]))).not.toContain('secret-token-value');
  });

  it('answers a malformed body before the middleware runs, with or without a token', async (): Promise<void> => {
    const withoutToken = await post('/protected', {}, '{"broken":');
    const withToken = await post('/protected', {authorization: 'Bearer header.payload.signature'}, '{"broken":');

    expect([withoutToken.status, withToken.status]).toStrictEqual([400, 400]);
    expect(withoutToken.body).toBe('"Malformed JSON body"');
    expect(accessTokenAuthenticator.receivedTokenList).toStrictEqual([]);
  });

  it('fails loudly on an endpoint that reads the authentication without the middleware', async (): Promise<void> => {
    const response = await post('/unprotected', {authorization: 'Bearer header.payload.signature'});

    expect(response.status).toBe(500);
    expect(response.body).toBe('"Unknown error"');
    expect(accessTokenAuthenticator.receivedTokenList).toStrictEqual([]);
  });
});
