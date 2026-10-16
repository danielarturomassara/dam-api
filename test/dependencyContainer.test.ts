import {Register} from '@account/application/useCase/Register.js';
import {REGISTRATION_STRATEGY_REGISTRY} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {ACCOUNT_CONFIG} from '@account/domain/AccountConfig.js';
import {ACCOUNT_REPOSITORY} from '@account/domain/AccountRepository.js';
import {ENCRYPTER} from '@account/domain/Encrypter.js';
import {AccountConfigEnvironment} from '@account/infrastructure/AccountConfigEnvironment.js';
import {CORE_CONFIG} from '@core/domain/CoreConfig.js';
import {ENVIRONMENT_READER} from '@core/domain/EnvironmentReader.js';
import {HTTP_ROUTER} from '@core/domain/HttpRouter.js';
import {HTTP_SERVER} from '@core/domain/HttpServer.js';
import {LOGGER} from '@core/domain/Logger.js';
import {MONGO_CONFIG} from '@core/domain/MongoConfig.js';
import {STARTUP_CONFIG_VALIDATION} from '@core/domain/StartupConfigValidation.js';
import {CoreConfigEnvironment} from '@core/infrastructure/CoreConfigEnvironment.js';
import {MongoConfigEnvironment} from '@core/infrastructure/MongoConfigEnvironment.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {DataSeeder} from '@core/infrastructure/mongodb/migration/DataSeeder.js';
import {RepositoryMongo} from '@core/infrastructure/mongodb/RepositoryMongo.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {beforeAll, describe, expect, it} from 'vitest';

// The container smoke test: every binding resolves with its full dependency chain. It catches
// unbound chains and decorator-metadata regressions (esbuild emits no design:paramtypes).
const REQUIRED_ENVIRONMENT: Record<string, string> = {
  API_NAME: 'api-test',
  API_PORT: '3000',
  LOG_LEVEL: 'error',
  MONGODB_DATABASE: 'smoke-test',
  MONGODB_HOST: 'localhost',
  MONGODB_PORT: '27017',
  NODE_ENV: 'test'
};

beforeAll((): void => {
  for (const [variableName, value] of Object.entries(REQUIRED_ENVIRONMENT)) {
    process.env[variableName] = value;
  }
});

const tokenList: Array<[string, (new (...constructorArguments: Array<never>) => unknown) | symbol]> = [
  ['ENVIRONMENT_READER', ENVIRONMENT_READER],
  ['CORE_CONFIG', CORE_CONFIG],
  ['MONGO_CONFIG', MONGO_CONFIG],
  ['LOGGER', LOGGER],
  ['HTTP_SERVER', HTTP_SERVER],
  ['HTTP_ROUTER', HTTP_ROUTER],
  ['MongoConnection', MongoConnection],
  ['RepositoryMongo', RepositoryMongo],
  ['DataSeeder', DataSeeder],
  ['ACCOUNT_CONFIG', ACCOUNT_CONFIG],
  ['ACCOUNT_REPOSITORY', ACCOUNT_REPOSITORY],
  ['ENCRYPTER', ENCRYPTER],
  ['REGISTRATION_STRATEGY_REGISTRY', REGISTRATION_STRATEGY_REGISTRY],
  ['Register', Register]
];

describe('dependencyContainer', (): void => {
  it.each(tokenList)('resolves %s with its full dependency chain', (_tokenName: string, token: (new (...constructorArguments: Array<never>) => unknown) | symbol): void => {
    expect(dependencyContainer.get(token)).toBeDefined();
  });

  it('validates every config at startup through STARTUP_CONFIG_VALIDATION', (): void => {
    const startupValidatedConfigList = dependencyContainer.getAll<unknown>(STARTUP_CONFIG_VALIDATION);

    expect(startupValidatedConfigList.some((config) => config instanceof CoreConfigEnvironment)).toBe(true);
    expect(startupValidatedConfigList.some((config) => config instanceof MongoConfigEnvironment)).toBe(true);
    expect(startupValidatedConfigList.some((config) => config instanceof AccountConfigEnvironment)).toBe(true);
  });
});
