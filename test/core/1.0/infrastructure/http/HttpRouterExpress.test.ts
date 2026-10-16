import {HttpRouterExpress} from '@core/infrastructure/http/HttpRouterExpress.js';
import express from 'express';
import {AddressInfo} from 'net';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../../double/CoreConfigFake.js';
import {LoggerSpy} from '../../double/LoggerSpy.js';

const FIXTURE_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'fixture');

const originalWorkingDirectory = process.cwd();

beforeAll((): void => {
  process.chdir(FIXTURE_DIRECTORY);
});

afterAll((): void => {
  process.chdir(originalWorkingDirectory);
});

const requestFixtureApplication = async (path: string): Promise<{body: unknown; status: number}> => {
  const logger = new LoggerSpy();
  const httpRouter = new HttpRouterExpress(new CoreConfigFake({apiName: 'api-test'}), logger);
  const application = express().use(await httpRouter.registerRoutes());
  const server = application.listen(0);
  const {port} = server.address() as AddressInfo;

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);

    return {body: await response.json(), status: response.status};
  } finally {
    server.close();
  }
};

describe('HttpRouterExpress', (): void => {
  it('discovers module routers, instantiates them with the core config and mounts them under their base path', async (): Promise<void> => {
    const response = await requestFixtureApplication('/present/');

    expect(response).toStrictEqual({body: 'api-test present', status: 200});
  });

  it('mounts the error middleware after the module routers so their errors are answered', async (): Promise<void> => {
    const response = await requestFixtureApplication('/present/missing');

    expect(response).toStrictEqual({body: 'Thing not found.', status: 404});
  });

  it('skips a discovery file without a router class, logging it as not found', async (): Promise<void> => {
    const logger = new LoggerSpy();
    const httpRouter = new HttpRouterExpress(new CoreConfigFake(), logger);

    const router = await httpRouter.registerRoutes();

    expect(logger.errorList).toHaveLength(1);
    expect(logger.errorList[0]?.message).toMatch(/^ModuleRouter class in file:\/\/.*broken\/ModuleRouter\.ts not found\.$/);
    expect(logger.infoList).toContain('present routes registered');
    expect(logger.infoList).toContain('Router Stack');
    expect(router.stack.at(-1)?.handle.length).toBe(4);
  });

  it('never discovers routers under test/ or node_modules/ directories', async (): Promise<void> => {
    const logger = new LoggerSpy();

    await expect(new HttpRouterExpress(new CoreConfigFake(), logger).registerRoutes()).resolves.toBeDefined();
    expect(logger.infoList.filter((message) => message.startsWith('Loading router from file:'))).toHaveLength(2);
  });

  it('exposes the root base path', (): void => {
    expect(new HttpRouterExpress(new CoreConfigFake(), new LoggerSpy()).getBasePath()).toBe('/');
  });
});
