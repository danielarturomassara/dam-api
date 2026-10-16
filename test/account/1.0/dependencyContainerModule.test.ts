import {AppleRegistration} from '@account/application/useCase/registration/AppleRegistration.js';
import {GoogleRegistration} from '@account/application/useCase/registration/GoogleRegistration.js';
import {MetaRegistration} from '@account/application/useCase/registration/MetaRegistration.js';
import {PasswordRegistration} from '@account/application/useCase/registration/PasswordRegistration.js';
import {PhoneRegistration} from '@account/application/useCase/registration/PhoneRegistration.js';
import {REGISTRATION_STRATEGY_REGISTRY, RegistrationStrategyRegistry} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {beforeAll, describe, expect, it} from 'vitest';

// Pins spec/approved/account.spec.md §3.5: the registry binds every provider to its strategy.

beforeAll((): void => {
  process.env.API_NAME = 'api-test';
  process.env.API_PORT = '3000';
  process.env.LOG_LEVEL = 'error';
  process.env.MONGODB_DATABASE = 'wiring-test';
  process.env.MONGODB_HOST = 'localhost';
  process.env.MONGODB_PORT = '27017';
  process.env.NODE_ENV = 'test';
});

describe('account dependencyContainerModule', (): void => {
  it.each([
    [IDENTITY_PROVIDERS.APPLE, AppleRegistration],
    [IDENTITY_PROVIDERS.GOOGLE, GoogleRegistration],
    [IDENTITY_PROVIDERS.META, MetaRegistration],
    [IDENTITY_PROVIDERS.PASSWORD, PasswordRegistration],
    [IDENTITY_PROVIDERS.PHONE, PhoneRegistration]
  ])('maps the %s provider to its strategy', (provider: IDENTITY_PROVIDERS, expectedClass: new (...constructorArguments: Array<never>) => unknown): void => {
    const registry = dependencyContainer.get<RegistrationStrategyRegistry>(REGISTRATION_STRATEGY_REGISTRY);

    expect(registry[provider]).toBeInstanceOf(expectedClass);
  });
});
