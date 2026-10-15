import {HttpRouter} from '@core/domain/HttpRouter.js';
import {HttpServerExpress} from '@core/infrastructure/http/HttpServerExpress.js';
import {Router} from 'express';
import {describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../../double/CoreConfigFake.js';
import {LoggerSpy} from '../../double/LoggerSpy.js';

const TEST_PORT = 43117;

class HttpRouterFake implements HttpRouter {
  public getBasePath (): string {
    return '/';
  }

  public async registerRoutes (): Promise<Router> {
    const router = Router();

    router.get('/ping', (_request, response): void => {
      response.status(200).json('pong');
    });

    return router;
  }
}

describe('HttpServerExpress', (): void => {
  it('serves the mounted routes as soon as start() resolves and logs the start line', async (): Promise<void> => {
    const logger = new LoggerSpy();
    const coreConfig = new CoreConfigFake({apiName: 'api-test', apiPort: TEST_PORT, nodeEnvironment: 'test'});
    const httpServer = new HttpServerExpress(coreConfig, logger, new HttpRouterFake());

    await httpServer.start();

    try {
      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/ping`);

      expect(response.status).toBe(200);
      expect(await response.json()).toBe('pong');
      expect(logger.infoList).toStrictEqual(['api-test running on port 43117 (test, debug false, log level error).']);
    } finally {
      await httpServer.stop();
    }
  });

  it('answers a malformed JSON body with 400 and a JSON reason through the logged error middleware', async (): Promise<void> => {
    const logger = new LoggerSpy();
    const httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: TEST_PORT}), logger, new HttpRouterFake());

    await httpServer.start();

    try {
      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/ping`, {body: '{"broken":', headers: {'content-type': 'application/json'}, method: 'POST'});

      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(await response.json()).toBe('Malformed JSON body');
      expect(logger.errorList).toHaveLength(1);
    } finally {
      await httpServer.stop();
    }
  });

  it('answers an oversized body with 413 and its reason', async (): Promise<void> => {
    const httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: TEST_PORT}), new LoggerSpy(), new HttpRouterFake());

    await httpServer.start();

    try {
      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/ping`, {body: JSON.stringify({payload: 'x'.repeat(3 * 1024 * 1024)}), headers: {'content-type': 'application/json'}, method: 'POST'});

      expect(response.status).toBe(413);
      expect(await response.json()).toBe('Payload too large.');
    } finally {
      await httpServer.stop();
    }
  });

  it('answers an unknown route with 404 and a JSON reason', async (): Promise<void> => {
    const httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: TEST_PORT}), new LoggerSpy(), new HttpRouterFake());

    await httpServer.start();

    try {
      const response = await fetch(`http://127.0.0.1:${TEST_PORT}/nowhere`);

      expect(response.status).toBe(404);
      expect(await response.json()).toBe('Route GET /nowhere not found.');
    } finally {
      await httpServer.stop();
    }
  });

  it('tolerates stop() before start() and releases the port on stop()', async (): Promise<void> => {
    const httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: TEST_PORT}), new LoggerSpy(), new HttpRouterFake());

    await expect(httpServer.stop()).resolves.toBeUndefined();

    await httpServer.start();
    await httpServer.stop();

    await expect(fetch(`http://127.0.0.1:${TEST_PORT}/ping`)).rejects.toThrow();
  });
});
