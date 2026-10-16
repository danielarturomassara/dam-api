import {EnvironmentReader} from '@core/domain/EnvironmentReader.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {injectable} from 'inversify';

@injectable()
export class EnvironmentReaderProcessEnv implements EnvironmentReader {
  private static readonly integerRegExp = /^-?\d+$/;

  public constructor () {}

  public getOptionalBoolean (variableName: string, defaultValue: boolean): boolean {
    const rawValue = this.readVariable(variableName);

    if (rawValue === null) {
      return defaultValue;
    }

    return this.parseBoolean(variableName, rawValue);
  }

  public getOptionalNumber (variableName: string, defaultValue: number): number {
    const rawValue = this.readVariable(variableName);

    if (rawValue === null) {
      return defaultValue;
    }

    return this.parseInteger(variableName, rawValue);
  }

  public getOptionalString (variableName: string): Nullable<string> {
    return this.readVariable(variableName);
  }

  public getRequiredEnum<ENUM_VALUE extends string> (variableName: string, enumObject: Record<string, ENUM_VALUE>): ENUM_VALUE {
    const rawValue = this.getRequiredString(variableName);
    const allowedValueList = Object.values(enumObject);
    const matchedValue = allowedValueList.find((allowedValue) => allowedValue === rawValue);

    if (matchedValue === undefined) {
      throw new ServerError(`Environment variable ${variableName} must be one of: ${allowedValueList.join(', ')}.`);
    }

    return matchedValue;
  }

  public getRequiredNumber (variableName: string): number {
    return this.parseInteger(variableName, this.getRequiredString(variableName));
  }

  public getRequiredString (variableName: string): string {
    const rawValue = this.readVariable(variableName);

    if (rawValue === null) {
      throw new ServerError(`Missing environment variable ${variableName}.`);
    }

    return rawValue;
  }

  private parseBoolean (variableName: string, rawValue: string): boolean {
    if (rawValue !== 'true' && rawValue !== 'false') {
      throw new ServerError(`Environment variable ${variableName} must be "true" or "false".`);
    }

    return rawValue === 'true';
  }

  private parseInteger (variableName: string, rawValue: string): number {
    if (!EnvironmentReaderProcessEnv.integerRegExp.test(rawValue)) {
      throw new ServerError(`Environment variable ${variableName} must be an integer.`);
    }

    return Number(rawValue);
  }

  private readVariable (variableName: string): Nullable<string> {
    const rawValue = process.env[variableName];

    if (rawValue === undefined || rawValue === '') {
      return null;
    }

    return rawValue;
  }
}
