import {DatabaseConnection} from '@core/domain/DatabaseConnection.js';
import {Logger, LOGGER} from '@core/domain/Logger.js';
import {POSTGRESQL_CONFIG, PostgreSqlConfig} from '@core/domain/PostgreSqlConfig.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {inject, injectable} from 'inversify';
import {Pool} from 'pg';

@injectable()
export class DatabaseConnectionPostgreSQL implements DatabaseConnection {
  private pool: Nullable<Pool> = null;

  public constructor (
    @inject(POSTGRESQL_CONFIG) private readonly postgreSqlConfig: PostgreSqlConfig,
    @inject(LOGGER) private readonly logger: Logger
  ) {}

  public async disconnect (): Promise<void> {
    if (!this.pool) {
      return;
    }

    this.logger.info('Disconnecting from PostgreSQL...');

    await this.pool.end();

    this.pool = null;
  }

  public async getDatabase (): Promise<Pool> {
    if (!this.pool) {
      this.logger.warning('Connection not yet established. Trying again...');

      this.pool = await this.connect();
    }

    return this.pool;
  }

  private async connect (): Promise<Pool> {
    this.logger.info('Connecting to PostgreSQL (Supabase)...');

    const pool = new Pool({
      database: this.postgreSqlConfig.getDatabaseName(),
      host: this.postgreSqlConfig.getHost(),
      password: this.postgreSqlConfig.getPassword(),
      port: this.postgreSqlConfig.getPort(),
      ssl: {rejectUnauthorized: false},
      user: this.postgreSqlConfig.getUser()
    });

    const client = await pool.connect();

    await client.query('SELECT 1');

    client.release();

    this.logger.info('PostgreSQL connection established successfully.');

    return pool;
  }
}
