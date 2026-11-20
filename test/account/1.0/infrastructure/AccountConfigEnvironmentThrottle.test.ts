import {AccountConfigEnvironment} from '@account/infrastructure/AccountConfigEnvironment.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {EnvironmentReaderProcessEnv} from '@core/infrastructure/EnvironmentReaderProcessEnv.js';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

const VARIABLE_NAME_LIST = ['ACCOUNT_THROTTLE_MAXIMUM_REQUESTS', 'ACCOUNT_THROTTLE_WINDOW_SECONDS'];

const clearEnvironment = (): void => {
  for (const variableName of VARIABLE_NAME_LIST) {
    delete process.env[variableName];
  }
};

const buildAccountConfig = (): AccountConfigEnvironment => new AccountConfigEnvironment(new EnvironmentReaderProcessEnv());

beforeEach(clearEnvironment);

afterEach(clearEnvironment);

describe('AccountConfigEnvironment throttle policy', (): void => {
  it('applies the documented defaults when both variables are absent', (): void => {
    expect(buildAccountConfig().getThrottlePolicy().toPrimitives()).toStrictEqual({maximumRequests: 20, windowSeconds: 300});
  });

  it('reads both variables', (): void => {
    process.env.ACCOUNT_THROTTLE_MAXIMUM_REQUESTS = '5';
    process.env.ACCOUNT_THROTTLE_WINDOW_SECONDS = '60';

    expect(buildAccountConfig().getThrottlePolicy().toPrimitives()).toStrictEqual({maximumRequests: 5, windowSeconds: 60});
  });

  it.each(VARIABLE_NAME_LIST.flatMap((variableName: string): Array<[string, string]> => [[variableName, '0'], [variableName, '-3']]))('aborts startup when %s is %s', (variableName: string, rawValue: string): void => {
    process.env[variableName] = rawValue;

    expect(buildAccountConfig).toThrow(new ServerError(`Environment variable ${variableName} must be at least 1.`));
  });

  it('aborts startup on a malformed value instead of applying the default', (): void => {
    process.env.ACCOUNT_THROTTLE_WINDOW_SECONDS = 'five';

    expect(buildAccountConfig).toThrow(new ServerError('Environment variable ACCOUNT_THROTTLE_WINDOW_SECONDS must be an integer.'));
  });
});
