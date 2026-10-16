import {Nullable} from '@core/domain/type/Nullable.js';

export interface MongoConfig {
  getDatabaseName (): string;
  getHost (): string;
  getPassword (): Nullable<string>;
  getPort (): number;
  getUser (): Nullable<string>;
}

export const MONGO_CONFIG = Symbol.for('MongoConfig');
