import {ENVIRONMENT_READER, EnvironmentReader} from '@core/domain/EnvironmentReader.js';
import {MongoConfig} from '@core/domain/MongoConfig.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {inject, injectable} from 'inversify';

@injectable()
export class MongoConfigEnvironment implements MongoConfig {
  private readonly databaseName: string;
  private readonly host: string;
  private readonly password: Nullable<string>;
  private readonly port: number;
  private readonly user: Nullable<string>;

  public constructor (@inject(ENVIRONMENT_READER) environmentReader: EnvironmentReader) {
    this.host = environmentReader.getRequiredString('MONGODB_HOST');
    this.port = environmentReader.getRequiredNumber('MONGODB_PORT');
    this.user = environmentReader.getOptionalString('MONGODB_USER');
    this.password = environmentReader.getOptionalString('MONGODB_PASSWORD');
    this.databaseName = environmentReader.getRequiredString('MONGODB_DATABASE');
  }

  public getDatabaseName (): string {
    return this.databaseName;
  }

  public getHost (): string {
    return this.host;
  }

  public getPassword (): Nullable<string> {
    return this.password;
  }

  public getPort (): number {
    return this.port;
  }

  public getUser (): Nullable<string> {
    return this.user;
  }
}
