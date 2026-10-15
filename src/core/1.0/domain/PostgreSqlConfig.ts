export interface PostgreSqlConfig {
  getDatabaseName (): string;
  getHost (): string;
  getPassword (): string;
  getPort (): number;
  getUser (): string;
}

export const POSTGRESQL_CONFIG = Symbol.for('PostgreSqlConfig');
