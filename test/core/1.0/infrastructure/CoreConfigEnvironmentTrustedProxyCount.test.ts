import {ServerError} from '@core/domain/error/ServerError.js';
import {CoreConfigEnvironment} from '@core/infrastructure/CoreConfigEnvironment.js';
import {EnvironmentReaderProcessEnv} from '@core/infrastructure/EnvironmentReaderProcessEnv.js';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

const reader = new EnvironmentReaderProcessEnv();

const CORE_ENVIRONMENT: Record<string, string> = {API_NAME: 'api', API_PORT: '3000', LOG_LEVEL: 'warning', NODE_ENV: 'test'};

const clearEnvironment = (): void => {
  for (const variableName of [...Object.keys(CORE_ENVIRONMENT), 'API_TRUSTED_PROXY_COUNT', 'DEBUG']) {
    delete process.env[variableName];
  }
};

beforeEach((): void => {
  clearEnvironment();

  for (const [variableName, value] of Object.entries(CORE_ENVIRONMENT)) {
    process.env[variableName] = value;
  }
});

afterEach((): void => {
  clearEnvironment();
});

describe('CoreConfigEnvironment trusted proxy count', (): void => {
  it('defaults to 1 when the variable is absent', (): void => {
    expect(new CoreConfigEnvironment(reader).getTrustedProxyCount()).toBe(1);
  });

  it.each([['0', 0], ['2', 2]])('reads %s', (rawValue: string, expectedCount: number): void => {
    process.env.API_TRUSTED_PROXY_COUNT = rawValue;

    expect(new CoreConfigEnvironment(reader).getTrustedProxyCount()).toBe(expectedCount);
  });

  it('fails at construction on a negative value', (): void => {
    process.env.API_TRUSTED_PROXY_COUNT = '-1';

    expect((): unknown => new CoreConfigEnvironment(reader)).toThrow(new ServerError('Environment variable API_TRUSTED_PROXY_COUNT must be zero or greater.'));
  });

  it('fails on a malformed value instead of applying the default', (): void => {
    process.env.API_TRUSTED_PROXY_COUNT = 'one';

    expect((): unknown => new CoreConfigEnvironment(reader)).toThrow(new ServerError('Environment variable API_TRUSTED_PROXY_COUNT must be an integer.'));
  });
});
