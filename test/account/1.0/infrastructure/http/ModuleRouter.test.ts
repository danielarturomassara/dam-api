import {ModuleRouter} from '@account/infrastructure/http/ModuleRouter.js';
import {describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../../../../core/1.0/double/CoreConfigFake.js';
import {LoggerSpy} from '../../../../core/1.0/double/LoggerSpy.js';

describe('account ModuleRouter', (): void => {
  it('mounts under /auth', (): void => {
    expect(new ModuleRouter(new CoreConfigFake(), new LoggerSpy()).getBasePath()).toBe('/auth');
  });

  it('registers the home route and the login, login code, logout, logout everywhere, register, token refresh and verify endpoints', async (): Promise<void> => {
    const router = await new ModuleRouter(new CoreConfigFake(), new LoggerSpy()).registerRoutes();
    const routeList = router.stack
      .map((layer): object | undefined => layer.route)
      .filter((route) => route !== undefined)
      .map((route) => `${Object.keys(Reflect.get(route, 'methods')).join(',').toUpperCase()} ${Reflect.get(route, 'path')}`);

    expect(routeList).toStrictEqual(['GET /', 'POST /login', 'POST /login/code', 'POST /logout', 'POST /logout/all', 'POST /register', 'POST /token/refresh', 'POST /verify']);
  });
});
