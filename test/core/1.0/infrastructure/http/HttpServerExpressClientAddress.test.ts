import {HttpRouter} from '@core/domain/HttpRouter.js';
import {HttpServerExpress} from '@core/infrastructure/http/HttpServerExpress.js';
import {Router} from 'express';
import {describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../../double/CoreConfigFake.js';
import {LoggerSpy} from '../../double/LoggerSpy.js';

const TEST_PORT = 43119;

const CALLER_CHOSEN_ADDRESS = '198.51.100.9';

const ADDRESS_SEEN_BY_PROXY = '203.0.113.7';

class ClientAddressRouter implements HttpRouter {
  public getBasePath (): string {
    return '/';
  }

  public async registerRoutes (): Promise<Router> {
    const router = Router();

    router.get('/address', (request, response): void => {
      response.status(200).json(request.ip);
    });

    return router;
  }
}

const readClientAddress = async (trustedProxyCount: number, forwardedFor: string): Promise<unknown> => {
  const httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: TEST_PORT, trustedProxyCount}), new LoggerSpy(), new ClientAddressRouter());

  await httpServer.start();

  try {
    const response = await fetch(`http://127.0.0.1:${TEST_PORT}/address`, {headers: {'x-forwarded-for': forwardedFor}});

    return await response.json();
  } finally {
    await httpServer.stop();
  }
};

describe('HttpServerExpress client address', (): void => {
  it('ignores X-Forwarded-For when no proxy is trusted', async (): Promise<void> => {
    const clientAddress = await readClientAddress(0, ADDRESS_SEEN_BY_PROXY);

    expect(String(clientAddress)).toContain('127.0.0.1');
  });

  it('reads the address from X-Forwarded-For when one proxy is trusted', async (): Promise<void> => {
    expect(await readClientAddress(1, ADDRESS_SEEN_BY_PROXY)).toBe(ADDRESS_SEEN_BY_PROXY);
  });

  it('trusts only the entry the one trusted proxy appended, not the one the caller sent', async (): Promise<void> => {
    expect(await readClientAddress(1, `${CALLER_CHOSEN_ADDRESS}, ${ADDRESS_SEEN_BY_PROXY}`)).toBe(ADDRESS_SEEN_BY_PROXY);
  });

  it('reads one entry further back for each additional trusted proxy', async (): Promise<void> => {
    expect(await readClientAddress(2, `${CALLER_CHOSEN_ADDRESS}, ${ADDRESS_SEEN_BY_PROXY}`)).toBe(CALLER_CHOSEN_ADDRESS);
  });
});
