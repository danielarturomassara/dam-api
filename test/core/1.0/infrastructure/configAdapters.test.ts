import {ServerError} from '@core/domain/error/ServerError.js';
import {LOG_LEVELS} from '@core/domain/type/LogLevels.js';
import {CoreConfigEnvironment} from '@core/infrastructure/CoreConfigEnvironment.js';
import {EnvironmentReaderProcessEnv} from '@core/infrastructure/EnvironmentReaderProcessEnv.js';
import {MongoConfigEnvironment} from '@core/infrastructure/MongoConfigEnvironment.js';
import {PostgreSqlConfigEnvironment} from '@core/infrastructure/PostgreSqlConfigEnvironment.js';
import {afterEach, describe, expect, it} from 'vitest';

// Pins spec/approved/core.spec.md §3.8: every variable each config adapter reads, its reader and default.

const reader = new EnvironmentReaderProcessEnv();

const VARIABLE_NAME_LIST = [
  'API_NAME', 'API_PORT', 'NODE_ENV', 'DEBUG', 'LOG_LEVEL',
  'MONGODB_HOST', 'MONGODB_PORT', 'MONGODB_USER', 'MONGODB_PASSWORD', 'MONGODB_DATABASE',
  'POSTGRESQL_HOST', 'POSTGRESQL_PORT', 'POSTGRESQL_USER', 'POSTGRESQL_PASSWORD', 'POSTGRESQL_DATABASE'
];

const setEnvironment = (variables: Record<string, string>): void => {
  for (const variableName of VARIABLE_NAME_LIST) {
    delete process.env[variableName];
  }

  for (const [variableName, value] of Object.entries(variables)) {
    process.env[variableName] = value;
  }
};

const CORE_ENVIRONMENT = {API_NAME: 'api', API_PORT: '3000', LOG_LEVEL: 'warning', NODE_ENV: 'test'};

const MONGO_ENVIRONMENT = {MONGODB_DATABASE: 'api', MONGODB_HOST: 'mongodb', MONGODB_PORT: '27017'};

const POSTGRESQL_ENVIRONMENT = {POSTGRESQL_DATABASE: 'api', POSTGRESQL_HOST: 'postgres', POSTGRESQL_PASSWORD: 'secret', POSTGRESQL_PORT: '5432', POSTGRESQL_USER: 'dev'};

afterEach((): void => {
  setEnvironment({});
});

describe('CoreConfigEnvironment', (): void => {
  it('resolves every variable at construction', (): void => {
    setEnvironment({...CORE_ENVIRONMENT, DEBUG: 'true'});

    const coreConfig = new CoreConfigEnvironment(reader);

    expect(coreConfig.getApiName()).toBe('api');
    expect(coreConfig.getApiPort()).toBe(3000);
    expect(coreConfig.getNodeEnvironment()).toBe('test');
    expect(coreConfig.isDebugEnabled()).toBe(true);
    expect(coreConfig.getLogLevel()).toBe(LOG_LEVELS.WARNING);
  });

  it('defaults DEBUG to false', (): void => {
    setEnvironment(CORE_ENVIRONMENT);

    expect(new CoreConfigEnvironment(reader).isDebugEnabled()).toBe(false);
  });

  it.each(['API_NAME', 'API_PORT', 'NODE_ENV', 'LOG_LEVEL'])('fails at construction when %s is missing', (variableName: string): void => {
    setEnvironment({...CORE_ENVIRONMENT, [variableName]: ''});

    expect((): unknown => new CoreConfigEnvironment(reader)).toThrow(new ServerError(`Missing environment variable ${variableName}.`));
  });

  it('rejects a log level outside the port vocabulary', (): void => {
    setEnvironment({...CORE_ENVIRONMENT, LOG_LEVEL: 'warn'});

    expect((): unknown => new CoreConfigEnvironment(reader)).toThrow(new ServerError('Environment variable LOG_LEVEL must be one of: debug, error, info, warning.'));
  });
});

describe('MongoConfigEnvironment', (): void => {
  it('resolves every variable at construction with optional credentials', (): void => {
    setEnvironment({...MONGO_ENVIRONMENT, MONGODB_PASSWORD: 'secret', MONGODB_USER: 'dev'});

    const mongoConfig = new MongoConfigEnvironment(reader);

    expect(mongoConfig.getHost()).toBe('mongodb');
    expect(mongoConfig.getPort()).toBe(27017);
    expect(mongoConfig.getUser()).toBe('dev');
    expect(mongoConfig.getPassword()).toBe('secret');
    expect(mongoConfig.getDatabaseName()).toBe('api');
  });

  it('leaves the credentials null when absent', (): void => {
    setEnvironment(MONGO_ENVIRONMENT);

    const mongoConfig = new MongoConfigEnvironment(reader);

    expect(mongoConfig.getUser()).toBeNull();
    expect(mongoConfig.getPassword()).toBeNull();
  });

  it.each(['MONGODB_HOST', 'MONGODB_PORT', 'MONGODB_DATABASE'])('fails at construction when %s is missing', (variableName: string): void => {
    setEnvironment({...MONGO_ENVIRONMENT, [variableName]: ''});

    expect((): unknown => new MongoConfigEnvironment(reader)).toThrow(new ServerError(`Missing environment variable ${variableName}.`));
  });
});

describe('PostgreSqlConfigEnvironment', (): void => {
  it('resolves every variable at construction', (): void => {
    setEnvironment(POSTGRESQL_ENVIRONMENT);

    const postgreSqlConfig = new PostgreSqlConfigEnvironment(reader);

    expect(postgreSqlConfig.getHost()).toBe('postgres');
    expect(postgreSqlConfig.getPort()).toBe(5432);
    expect(postgreSqlConfig.getUser()).toBe('dev');
    expect(postgreSqlConfig.getPassword()).toBe('secret');
    expect(postgreSqlConfig.getDatabaseName()).toBe('api');
  });

  it.each(Object.keys(POSTGRESQL_ENVIRONMENT))('fails at construction when %s is missing', (variableName: string): void => {
    setEnvironment({...POSTGRESQL_ENVIRONMENT, [variableName]: ''});

    expect((): unknown => new PostgreSqlConfigEnvironment(reader)).toThrow(new ServerError(`Missing environment variable ${variableName}.`));
  });
});
