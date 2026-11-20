import {Login} from '@account/application/useCase/Login.js';
import {PasswordVerification} from '@account/application/useCase/verification/PasswordVerification.js';
import {VERIFICATION_STRATEGY_REGISTRY, VerificationStrategyRegistry} from '@account/application/useCase/verification/VerificationStrategy.js';
import {VerifyIdentity} from '@account/application/useCase/VerifyIdentity.js';
import {THROTTLE_SCOPES} from '@account/domain/ThrottleScopes.js';
import {ModuleRouter} from '@account/infrastructure/http/ModuleRouter.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {beforeAll, describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../../core/1.0/double/CoreConfigFake.js';
import {LoggerSpy} from '../../core/1.0/double/LoggerSpy.js';

beforeAll((): void => {
  process.env.ACCOUNT_JWT_SECRET = 'wiring-test-secret-of-at-least-32-characters';
  process.env.API_NAME = 'api-test';
  process.env.API_PORT = '3000';
  process.env.LOG_LEVEL = 'error';
  process.env.MONGODB_DATABASE = 'wiring-test';
  process.env.MONGODB_HOST = 'localhost';
  process.env.MONGODB_PORT = '27017';
  process.env.NODE_ENV = 'test';
});

describe('account verification wiring', (): void => {
  it('wires a verification strategy only for the password provider, whose identity is verified through a link', (): void => {
    const registry = dependencyContainer.get<VerificationStrategyRegistry>(VERIFICATION_STRATEGY_REGISTRY);

    expect(Object.keys(registry)).toStrictEqual(['password']);
    expect(registry.password).toBeInstanceOf(PasswordVerification);
    expect(dependencyContainer.get(VERIFICATION_STRATEGY_REGISTRY)).toBe(registry);
  });

  it.each([['VerifyIdentity', VerifyIdentity], ['Login', Login]])('resolves the %s use case', (_useCaseName: string, useCaseClass: new (...constructorArguments: Array<never>) => unknown): void => {
    expect(dependencyContainer.get(useCaseClass)).toBeInstanceOf(useCaseClass);
  });

  it('names the verify throttle scope', (): void => {
    expect(THROTTLE_SCOPES.VERIFY).toBe('account.verify');
  });

  it('registers the verify endpoint', async (): Promise<void> => {
    const router = await new ModuleRouter(new CoreConfigFake(), new LoggerSpy()).registerRoutes();
    const routeList = router.stack
      .map((layer): object | undefined => layer.route)
      .filter((route) => route !== undefined)
      .map((route) => `${Object.keys(Reflect.get(route, 'methods')).join(',').toUpperCase()} ${Reflect.get(route, 'path')}`);

    expect(routeList).toContain('POST /verify');
  });
});
