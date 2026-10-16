import {ENVIRONMENT_READER, EnvironmentReader} from '@core/domain/EnvironmentReader.js';
import {PostgreSqlConfig} from '@core/domain/PostgreSqlConfig.js';
import {inject, injectable} from 'inversify';

@injectable()
export class PostgreSqlConfigEnvironment implements PostgreSqlConfig {
  private readonly databaseName: string;
  private readonly host: string;
  private readonly password: string;
  private readonly port: number;
  private readonly user: string;

  public constructor (@inject(ENVIRONMENT_READER) environmentReader: EnvironmentReader) {
    this.host = environmentReader.getRequiredString('POSTGRESQL_HOST');
    this.port = environmentReader.getRequiredNumber('POSTGRESQL_PORT');
    this.user = environmentReader.getRequiredString('POSTGRESQL_USER');
    this.password = environmentReader.getRequiredString('POSTGRESQL_PASSWORD');
    this.databaseName = environmentReader.getRequiredString('POSTGRESQL_DATABASE');
  }

  public getDatabaseName (): string {
    return this.databaseName;
  }

  public getHost (): string {
    return this.host;
  }

  public getPassword (): string {
    return this.password;
  }

  public getPort (): number {
    return this.port;
  }

  public getUser (): string {
    return this.user;
  }
}
