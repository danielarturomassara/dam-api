import { Config } from '@core/Config.js';
import { Logger, LOGGER } from '@core/domain/Logger.js';
import { Nullable } from '@core/domain/type/Nullable.js';
import { inject, injectable } from 'inversify';
import * as mongodb from 'mongodb';

@injectable()
export class MongoConnection {
  private client: Nullable<mongodb.MongoClient>;
  private databaseName: string;

  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger
  ) {
    this.client = null;
    this.databaseName = this.config.getDatabaseName();
  }

  public async disconnect (): Promise<void> {
    if (this.client) {
      this.logger.info('Disconnecting from mongodb...');

      await this.client.close();

      this.client = null;
    }

    return;
  }

  public async getDatabase (): Promise<mongodb.Db> {
    if (!this.client) {
      this.logger.warning('Connection not yet established. Trying again...');

      this.client = await this.connect();
    }

    return this.client.db(this.databaseName);
  }

  private async connect (): Promise<mongodb.MongoClient> {
    const databasePort = this.config.getDatabasePort();
    const connectionString = `mongodb://${ this.getCredentialsString() }:${ databasePort }/?authSource=${
      this.databaseName
    }`;
    const client = new mongodb.MongoClient(connectionString);

    this.logger.info('Connecting to mongodb...');

    return await client.connect();
  }

  private getCredentialsString (): string {
    const databaseUser = this.config.getDatabaseUser();
    const databasePassword = this.config.getDatabasePassword();
    const databaseHost = this.config.getDatabaseHost();

    if (!databaseUser || !databasePassword) {
      return databaseHost;
    }

    return `${ databaseUser }:${ databasePassword }@${ databaseHost }`;
  }
}
