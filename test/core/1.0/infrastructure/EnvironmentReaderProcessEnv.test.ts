import {ServerError} from '@core/domain/error/ServerError.js';
import {EnvironmentReaderProcessEnv} from '@core/infrastructure/EnvironmentReaderProcessEnv.js';
import {afterEach, describe, expect, it} from 'vitest';

enum COLORS {
  BLUE = 'blue',
  RED = 'red'
}

const VARIABLE_NAME = 'CORE_TEST_VARIABLE';

const reader = new EnvironmentReaderProcessEnv();

const setVariable = (value: string | undefined): void => {
  if (value === undefined) {
    delete process.env[VARIABLE_NAME];

    return;
  }

  process.env[VARIABLE_NAME] = value;
};

afterEach((): void => {
  setVariable(undefined);
});

describe('EnvironmentReaderProcessEnv', (): void => {
  it.each([undefined, ''])('treats %j as missing for every reader', (value: string | undefined): void => {
    setVariable(value);

    expect((): unknown => reader.getRequiredString(VARIABLE_NAME)).toThrow(new ServerError(`Missing environment variable ${VARIABLE_NAME}.`));
    expect((): unknown => reader.getRequiredNumber(VARIABLE_NAME)).toThrow(ServerError);
    expect((): unknown => reader.getRequiredEnum(VARIABLE_NAME, COLORS)).toThrow(ServerError);
    expect(reader.getOptionalString(VARIABLE_NAME)).toBeNull();
    expect(reader.getOptionalNumber(VARIABLE_NAME, 7)).toBe(7);
    expect(reader.getOptionalBoolean(VARIABLE_NAME, true)).toBe(true);
  });

  it('returns present strings verbatim', (): void => {
    setVariable('  value  ');

    expect(reader.getRequiredString(VARIABLE_NAME)).toBe('  value  ');
    expect(reader.getOptionalString(VARIABLE_NAME)).toBe('  value  ');
  });

  it.each(['12', '-3', '0'])('parses the integer %s', (value: string): void => {
    setVariable(value);

    expect(reader.getRequiredNumber(VARIABLE_NAME)).toBe(Number(value));
    expect(reader.getOptionalNumber(VARIABLE_NAME, 99)).toBe(Number(value));
  });

  it.each(['12abc', '1.5', ' 12', 'twelve'])('rejects the malformed integer %j instead of applying a default', (value: string): void => {
    setVariable(value);

    const expectedError = new ServerError(`Environment variable ${VARIABLE_NAME} must be an integer.`);

    expect((): unknown => reader.getRequiredNumber(VARIABLE_NAME)).toThrow(expectedError);
    expect((): unknown => reader.getOptionalNumber(VARIABLE_NAME, 99)).toThrow(expectedError);
  });

  it('matches an enum value', (): void => {
    setVariable('red');

    expect(reader.getRequiredEnum(VARIABLE_NAME, COLORS)).toBe(COLORS.RED);
  });

  it('lists the allowed values when the enum does not match', (): void => {
    setVariable('green');

    expect((): unknown => reader.getRequiredEnum(VARIABLE_NAME, COLORS)).toThrow(new ServerError(`Environment variable ${VARIABLE_NAME} must be one of: blue, red.`));
  });

  it.each([['true', true], ['false', false]])('parses the boolean %s', (value: string, expected: boolean): void => {
    setVariable(value);

    expect(reader.getOptionalBoolean(VARIABLE_NAME, !expected)).toBe(expected);
  });

  it.each(['TRUE', '1', 'yes'])('rejects the malformed boolean %j instead of applying a default', (value: string): void => {
    setVariable(value);

    expect((): unknown => reader.getOptionalBoolean(VARIABLE_NAME, false)).toThrow(new ServerError(`Environment variable ${VARIABLE_NAME} must be "true" or "false".`));
  });
});
