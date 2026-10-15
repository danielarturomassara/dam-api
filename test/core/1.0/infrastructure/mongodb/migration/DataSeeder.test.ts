import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {DataSeeder} from '@core/infrastructure/mongodb/migration/DataSeeder.js';
import {Binary, UUID} from 'mongodb';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../../../double/CoreConfigFake.js';
import {LoggerSpy} from '../../../double/LoggerSpy.js';
import {MongoTestServer} from '../../../double/MongoTestServer.js';

const FIXTURE_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'fixture');

const originalWorkingDirectory = process.cwd();

const mongoTestServer = new MongoTestServer('core-seeder-test');

beforeAll(async (): Promise<void> => {
  await mongoTestServer.getUri();

  process.chdir(FIXTURE_DIRECTORY);
}, 120000);

afterAll(async (): Promise<void> => {
  process.chdir(originalWorkingDirectory);

  await mongoTestServer.stop();
});

describe('DataSeeder', (): void => {
  it('refuses a seed item whose id is not a uuid string and a seed file that is not an array', async (): Promise<void> => {
    const seeder = new DataSeeder(new CoreConfigFake({nodeEnvironment: 'test'}), new LoggerSpy(), mongoTestServer.buildConnection());
    process.chdir(join(dirname(fileURLToPath(import.meta.url)), 'fixtureBroken'));

    try {
      await expect(seeder.populate()).rejects.toThrow(InvalidArgument);
    } finally {
      process.chdir(FIXTURE_DIRECTORY);
    }
  });

  it('does nothing in production', async (): Promise<void> => {
    const logger = new LoggerSpy();
    const dataSeeder = new DataSeeder(new CoreConfigFake({nodeEnvironment: 'production'}), logger, mongoTestServer.buildConnection());

    await dataSeeder.populate();

    expect(logger.infoList).toStrictEqual([]);
  });

  it('drops and re-inserts every seed file as a collection, ids as BSON UUIDs, dates decoded', async (): Promise<void> => {
    const logger = new LoggerSpy();
    const mongoConnection = mongoTestServer.buildConnection();
    const dataSeeder = new DataSeeder(new CoreConfigFake({nodeEnvironment: 'test'}), logger, mongoConnection);

    await dataSeeder.populate();
    await dataSeeder.populate();

    const database = await mongoConnection.getDatabase();
    const documentList = await database.collection('things').find().sort({name: 1}).toArray();

    const widgetDocument: object | undefined = documentList[1];
    const widgetId = widgetDocument ? Reflect.get(widgetDocument, '_id') as Binary : null;

    expect(documentList).toHaveLength(2);
    expect(documentList[0]).toMatchObject({name: 'gadget', since: new Date('2026-01-05T10:00:00.000Z'), tags: ['a', 'b']});
    expect(documentList[1]).toMatchObject({created_at: new Date(1735000000000), name: 'widget'});
    expect(widgetId?.sub_type).toBe(Binary.SUBTYPE_UUID);
    expect(widgetId?.length()).toBe(16);
    expect(new UUID(Buffer.from(widgetId?.buffer ?? [])).toHexString(true)).toBe('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
    expect(logger.infoList).toContain('Found seed file: things.json');
    expect(logger.infoList).toContain('things.json contains 2 documents.');
    expect(logger.infoList).toContain('Collection things seeded successfully.');
  });
});
