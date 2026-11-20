import {AccountConfigEnvironment} from '@account/infrastructure/AccountConfigEnvironment.js';
import {TokenSigningConfigEnvironment} from '@account/infrastructure/TokenSigningConfigEnvironment.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {EnvironmentReaderProcessEnv} from '@core/infrastructure/EnvironmentReaderProcessEnv.js';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

const VARIABLE_NAME_LIST = [
  'ACCOUNT_ACCESS_TOKEN_LIFETIME_SECONDS',
  'ACCOUNT_JWT_SECRET',
  'ACCOUNT_LOGIN_CODE_LIFETIME_SECONDS',
  'ACCOUNT_LOGIN_CODE_MAXIMUM_ATTEMPTS',
  'ACCOUNT_LOGIN_CODE_RESEND_INTERVAL_SECONDS',
  'ACCOUNT_REFRESH_TOKEN_LIFETIME_SECONDS'
];

const clearEnvironment = (): void => {
  for (const variableName of VARIABLE_NAME_LIST) {
    delete process.env[variableName];
  }
};

const buildAccountConfig = (): AccountConfigEnvironment => new AccountConfigEnvironment(new EnvironmentReaderProcessEnv());

const buildTokenSigningConfig = (): TokenSigningConfigEnvironment => new TokenSigningConfigEnvironment(new EnvironmentReaderProcessEnv());

beforeEach(clearEnvironment);

afterEach(clearEnvironment);

describe('AccountConfigEnvironment login settings', (): void => {
  it('applies the documented defaults when every variable is absent', (): void => {
    const accountConfig = buildAccountConfig();

    expect(accountConfig.getAccessTokenLifetimeSeconds()).toBe(900);
    expect(accountConfig.getRefreshTokenLifetimeSeconds()).toBe(2_592_000);
    expect(accountConfig.getLoginChallengePolicy().toPrimitives()).toStrictEqual({lifetimeSeconds: 300, maximumAttempts: 5, resendIntervalSeconds: 60});
  });

  it('reads every variable', (): void => {
    process.env.ACCOUNT_ACCESS_TOKEN_LIFETIME_SECONDS = '60';
    process.env.ACCOUNT_REFRESH_TOKEN_LIFETIME_SECONDS = '61';
    process.env.ACCOUNT_LOGIN_CODE_LIFETIME_SECONDS = '30';
    process.env.ACCOUNT_LOGIN_CODE_MAXIMUM_ATTEMPTS = '1';
    process.env.ACCOUNT_LOGIN_CODE_RESEND_INTERVAL_SECONDS = '30';

    const accountConfig = buildAccountConfig();

    expect(accountConfig.getAccessTokenLifetimeSeconds()).toBe(60);
    expect(accountConfig.getRefreshTokenLifetimeSeconds()).toBe(61);
    expect(accountConfig.getLoginChallengePolicy().toPrimitives()).toStrictEqual({lifetimeSeconds: 30, maximumAttempts: 1, resendIntervalSeconds: 30});
  });

  it('accepts a resend interval of zero', (): void => {
    process.env.ACCOUNT_LOGIN_CODE_RESEND_INTERVAL_SECONDS = '0';

    expect(buildAccountConfig().getLoginChallengePolicy().toPrimitives().resendIntervalSeconds).toBe(0);
  });

  it.each([
    ['ACCOUNT_ACCESS_TOKEN_LIFETIME_SECONDS', '59', 'must be at least 60.'],
    ['ACCOUNT_LOGIN_CODE_LIFETIME_SECONDS', '29', 'must be at least 30.'],
    ['ACCOUNT_LOGIN_CODE_MAXIMUM_ATTEMPTS', '0', 'must be at least 1.'],
    ['ACCOUNT_LOGIN_CODE_RESEND_INTERVAL_SECONDS', '-1', 'must be at least 0.'],
    ['ACCOUNT_LOGIN_CODE_RESEND_INTERVAL_SECONDS', '301', 'must be at most ACCOUNT_LOGIN_CODE_LIFETIME_SECONDS.'],
    ['ACCOUNT_REFRESH_TOKEN_LIFETIME_SECONDS', '900', 'must be greater than ACCOUNT_ACCESS_TOKEN_LIFETIME_SECONDS.'],
    ['ACCOUNT_REFRESH_TOKEN_LIFETIME_SECONDS', '10', 'must be greater than ACCOUNT_ACCESS_TOKEN_LIFETIME_SECONDS.'],
    ['ACCOUNT_LOGIN_CODE_MAXIMUM_ATTEMPTS', 'five', 'must be an integer.']
  ])('aborts startup when %s is %s', (variableName: string, rawValue: string, expectedRule: string): void => {
    process.env[variableName] = rawValue;

    expect(buildAccountConfig).toThrow(new ServerError(`Environment variable ${variableName} ${expectedRule}`));
  });
});

describe('TokenSigningConfigEnvironment', (): void => {
  it('reads the signing secret', (): void => {
    process.env.ACCOUNT_JWT_SECRET = 'a-secret-of-exactly-32-characters';

    expect(buildTokenSigningConfig().getSigningSecret()).toBe('a-secret-of-exactly-32-characters');
  });

  it.each([undefined, ''])('aborts startup when the secret is %s: there is no default secret', (rawValue: string | undefined): void => {
    if (rawValue !== undefined) {
      process.env.ACCOUNT_JWT_SECRET = rawValue;
    }

    expect(buildTokenSigningConfig).toThrow(new ServerError('Missing environment variable ACCOUNT_JWT_SECRET.'));
  });

  it('aborts startup when the secret is shorter than 32 characters', (): void => {
    process.env.ACCOUNT_JWT_SECRET = 'x'.repeat(31);

    expect(buildTokenSigningConfig).toThrow(new ServerError('Environment variable ACCOUNT_JWT_SECRET must be at least 32 characters long.'));
  });

  it('accepts a secret of exactly 32 characters', (): void => {
    process.env.ACCOUNT_JWT_SECRET = 'x'.repeat(32);

    expect(buildTokenSigningConfig().getSigningSecret()).toHaveLength(32);
  });
});
