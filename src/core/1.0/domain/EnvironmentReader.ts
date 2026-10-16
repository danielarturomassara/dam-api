import {Nullable} from '@core/domain/type/Nullable.js';

export interface EnvironmentReader {
  getOptionalBoolean (variableName: string, defaultValue: boolean): boolean;
  getOptionalNumber (variableName: string, defaultValue: number): number;
  getOptionalString (variableName: string): Nullable<string>;
  getRequiredEnum<ENUM_VALUE extends string> (variableName: string, enumObject: Record<string, ENUM_VALUE>): ENUM_VALUE;
  getRequiredNumber (variableName: string): number;
  getRequiredString (variableName: string): string;
}

export const ENVIRONMENT_READER = Symbol.for('EnvironmentReader');
