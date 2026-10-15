import {Logger, LOGGER} from '@core/domain/Logger.js';
import {MONGO_CONFIG, MongoConfig} from '@core/domain/MongoConfig.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {inject, injectable} from 'inversify';
import {Db, MongoClient} from 'mongodb';

@injectable()
export class MongoConnection {
  private client: Nullable<MongoClient> = null;

  public constructor (
    @inject(MONGO_CONFIG) private readonly mongoConfig: MongoConfig,
    @inject(LOGGER) private readonly logger: Logger
  ) {}

  public async disconnect (): Promise<void> {
    if (!this.client) {
      return;
    }

    this.logger.info('Disconnecting from mongodb...');

    await this.client.close();

    this.client = null;
  }

  public async getDatabase (): Promise<Db> {
    if (!this.client) {
      this.logger.warning('Connection not yet established. Trying again...');

      this.client = await this.connect();
    }

    return this.client.db(this.mongoConfig.getDatabaseName());
  }

  private buildConnectionString (): string {
    const port = this.mongoConfig.getPort();
    const databaseName = this.mongoConfig.getDatabaseName();

    return `mongodb://${this.buildCredentials()}:${port}/?authSource=${databaseName}`;
  }

  private buildCredentials (): string {
    const host = this.mongoConfig.getHost();
    const user = this.mongoConfig.getUser();
    const password = this.mongoConfig.getPassword();

    if (user === null || password === null) {
      return host;
    }

    return `${user}:${password}@${host}`;
  }

  private async connect (): Promise<MongoClient> {
    this.logger.info('Connecting to mongodb...');

    const client = new MongoClient(this.buildConnectionString());

    return client.connect();
  }
}
