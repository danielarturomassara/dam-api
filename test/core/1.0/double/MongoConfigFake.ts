import {MongoConfig} from '@core/domain/MongoConfig.js';
import {Nullable} from '@core/domain/type/Nullable.js';

export interface MongoConfigFakeOptions {
  databaseName: string;
  host: string;
  password: Nullable<string>;
  port: number;
  user: Nullable<string>;
}

export class MongoConfigFake implements MongoConfig {
  public constructor (private readonly options: MongoConfigFakeOptions) {}

  public getDatabaseName (): string {
    return this.options.databaseName;
  }

  public getHost (): string {
    return this.options.host;
  }

  public getPassword (): Nullable<string> {
    return this.options.password;
  }

  public getPort (): number {
    return this.options.port;
  }

  public getUser (): Nullable<string> {
    return this.options.user;
  }
}
