import {AccountConfigEnvironment} from '@account/infrastructure/AccountConfigEnvironment.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {EnvironmentReaderProcessEnv} from '@core/infrastructure/EnvironmentReaderProcessEnv.js';
import {afterEach, describe, expect, it} from 'vitest';

// Pins spec/approved/account.spec.md §3.4.

const VARIABLE_NAME_LIST = [
  'ACCOUNT_PASSWORD_MINIMUM_DIGITS',
  'ACCOUNT_PASSWORD_MINIMUM_LOWERCASE',
  'ACCOUNT_PASSWORD_MINIMUM_SYMBOLS',
  'ACCOUNT_PASSWORD_MINIMUM_UPPERCASE',
  'ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH'
];

const setEnvironment = (variables: Record<string, string>): void => {
  for (const variableName of VARIABLE_NAME_LIST) {
    delete process.env[variableName];
  }

  for (const [variableName, value] of Object.entries(variables)) {
    process.env[variableName] = value;
  }
};

const buildAccountConfig = (): AccountConfigEnvironment => new AccountConfigEnvironment(new EnvironmentReaderProcessEnv());

afterEach((): void => {
  setEnvironment({});
});

describe('AccountConfigEnvironment', (): void => {
  it('applies the documented defaults when every variable is absent', (): void => {
    setEnvironment({});

    const accountConfig = buildAccountConfig();

    expect(accountConfig.getPasswordCompositionRules().toPrimitives()).toStrictEqual({minimumDigitCount: 0, minimumLowercaseCount: 0, minimumSymbolCount: 0, minimumUppercaseCount: 0});
    expect(accountConfig.getVerificationCodeLength()).toBe(6);
  });

  it('reads every variable', (): void => {
    setEnvironment({
      ACCOUNT_PASSWORD_MINIMUM_DIGITS: '1',
      ACCOUNT_PASSWORD_MINIMUM_LOWERCASE: '2',
      ACCOUNT_PASSWORD_MINIMUM_SYMBOLS: '3',
      ACCOUNT_PASSWORD_MINIMUM_UPPERCASE: '4',
      ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH: '8'
    });

    const accountConfig = buildAccountConfig();

    expect(accountConfig.getPasswordCompositionRules().toPrimitives()).toStrictEqual({minimumDigitCount: 1, minimumLowercaseCount: 2, minimumSymbolCount: 3, minimumUppercaseCount: 4});
    expect(accountConfig.getVerificationCodeLength()).toBe(8);
  });

  it.each(VARIABLE_NAME_LIST.slice(0, 4))('aborts startup when %s is negative', (variableName: string): void => {
    setEnvironment({[variableName]: '-1'});

    expect(buildAccountConfig).toThrow(new ServerError(`Environment variable ${variableName} must be zero or greater.`));
  });

  it('aborts startup when the code length is below 1', (): void => {
    setEnvironment({ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH: '0'});

    expect(buildAccountConfig).toThrow(new ServerError('Environment variable ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH must be at least 1.'));
  });

  it('aborts startup on a malformed value instead of applying the default', (): void => {
    setEnvironment({ACCOUNT_PASSWORD_MINIMUM_DIGITS: 'two'});

    expect(buildAccountConfig).toThrow(new ServerError('Environment variable ACCOUNT_PASSWORD_MINIMUM_DIGITS must be an integer.'));
  });
});
