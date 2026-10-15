import {MongoConfig} from '@core/domain/MongoConfig.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {LoggerSpy} from '../double/LoggerSpy.js';
import {MongoConfigFake} from '../double/MongoConfigFake.js';
import {MongoTestServer} from '../double/MongoTestServer.js';

// The compose mongod authenticates its users against `admin`, and the adapter's connection string
// uses the configured database as authSource — so this suite targets the `admin` database, the
// only one the spec's string can authenticate against with a root user.
const mongoTestServer = new MongoTestServer('admin');

let mongoConfig: MongoConfig;

beforeAll(async (): Promise<void> => {
  const uri = new URL(await mongoTestServer.getUri());

  mongoConfig = new MongoConfigFake({
    databaseName: 'admin',
    host: uri.hostname,
    password: uri.password === '' ? null : decodeURIComponent(uri.password),
    port: Number(uri.port),
    user: uri.username === '' ? null : decodeURIComponent(uri.username)
  });
}, 120000);

afterAll(async (): Promise<void> => {
  await mongoTestServer.stop();
});

describe('MongoConnection', (): void => {
  it('connects on first use, returns the configured database and logs the steps', async (): Promise<void> => {
    const logger = new LoggerSpy();
    const mongoConnection = new MongoConnection(mongoConfig, logger);

    const database = await mongoConnection.getDatabase();

    expect(database.databaseName).toBe('admin');
    expect(await database.command({ping: 1})).toMatchObject({ok: 1});
    expect(logger.warningList).toStrictEqual(['Connection not yet established. Trying again...']);
    expect(logger.infoList).toStrictEqual(['Connecting to mongodb...']);

    await mongoConnection.disconnect();

    expect(logger.infoList).toStrictEqual(['Connecting to mongodb...', 'Disconnecting from mongodb...']);
  });

  it('reuses the connection and treats disconnect as a no-op when nothing is connected', async (): Promise<void> => {
    const logger = new LoggerSpy();
    const mongoConnection = new MongoConnection(mongoConfig, logger);

    await mongoConnection.disconnect();

    expect(logger.infoList).toStrictEqual([]);

    await mongoConnection.getDatabase();
    await mongoConnection.getDatabase();

    expect(logger.warningList).toHaveLength(1);

    await mongoConnection.disconnect();
  });
});
