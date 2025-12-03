import { Config } from '@core/Config.js';
import { Logger, LOGGER } from '@core/domain/Logger.js';
import { Nullable } from '@core/domain/type/Nullable.js';
import { inject, injectable } from 'inversify';
import { Pool } from 'pg';

@injectable()
export class DatabaseConnectionPostgreSQL {
  private pool: Nullable<Pool>;

  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger
  ) {
    this.pool = null;
  }

  public async disconnect (): Promise<void> {
    if (this.pool) {
      this.logger.info('Disconnecting from PostgreSQL...');

      await this.pool.end();

      this.pool = null;
    }

    return;
  }

  public async getDatabase (): Promise<Pool> {
    if (!this.pool) {
      this.logger.warning('Connection not yet established. Trying again...');

      this.pool = await this.connect();
    }

    return await this.pool;
  }

  private async connect (): Promise<Pool> {
    const databaseHost = this.config.getDatabaseHost();
    const databasePort = this.config.getDatabasePort();
    const databaseUser = this.config.getDatabaseUser();
    const databasePassword = this.config.getDatabasePassword();
    const databaseName = this.config.getDatabaseName();

    const sslRequired = true;

    this.logger.info('Connecting to PostgreSQL (Supabase)...');

    const pool = new Pool({
      database: databaseName,
      host: databaseHost,
      password: databasePassword,
      port: databasePort,
      ssl: sslRequired ? { rejectUnauthorized: false } : false,
      user: databaseUser
    });

    const client = await pool.connect();

    await client.query('SELECT 1');

    client.release();

    this.logger.info('PostgreSQL connection established successfully.');

    return pool;
  }
}
