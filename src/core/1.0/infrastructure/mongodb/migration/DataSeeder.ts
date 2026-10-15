import {CORE_CONFIG, CoreConfig} from '@core/domain/CoreConfig.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Logger, LOGGER} from '@core/domain/Logger.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {SeedDocumentFormatter} from '@core/infrastructure/mongodb/migration/SeedDocumentFormatter.js';
import {readFile} from 'fs/promises';
import {glob} from 'glob';
import {inject, injectable} from 'inversify';
import {UUID} from 'mongodb';
import {basename} from 'path';

const DISCOVERY_IGNORE_LIST = ['node_modules/**', 'test/**'];

@injectable()
export class DataSeeder {
  public constructor (
    @inject(CORE_CONFIG) private readonly coreConfig: CoreConfig,
    @inject(LOGGER) private readonly logger: Logger,
    @inject(MongoConnection) private readonly mongoConnection: MongoConnection
  ) {}

  public async populate (): Promise<void> {
    if (this.coreConfig.getNodeEnvironment() === 'production') {
      return;
    }

    for (const seedFile of await glob('**/mongodb/seed/*.json', {ignore: DISCOVERY_IGNORE_LIST})) {
      await this.seedCollection(seedFile);
    }

    await this.mongoConnection.disconnect();
  }

  private async readSeedDocuments (seedFile: string): Promise<Array<Record<string, unknown>>> {
    const parsedContent: unknown = JSON.parse(await readFile(seedFile, 'utf8'));

    if (!Array.isArray(parsedContent)) {
      throw new InvalidArgument({customMessage: `Seed file ${seedFile} must contain a JSON array`});
    }

    return parsedContent.map((item: unknown) => this.toSeedDocument(item));
  }

  private async seedCollection (seedFile: string): Promise<void> {
    const filename = basename(seedFile);
    const collectionName = filename.replace('.json', '').replace('.csv', '');

    this.logger.info(`Found seed file: ${filename}`);

    const documentList = await this.readSeedDocuments(seedFile);

    this.logger.info(`${filename} contains ${documentList.length} documents.`);

    const database = await this.mongoConnection.getDatabase();
    const collection = database.collection(collectionName);

    this.logger.info(`Dropping ${collectionName} collection...`);
    await collection.drop();

    this.logger.info(`Inserting ${documentList.length} documents into ${collectionName} collection...`);
    await collection.insertMany(documentList);

    this.logger.info(`Collection ${collectionName} seeded successfully.`);
  }

  private toSeedDocument (item: unknown): Record<string, unknown> {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new InvalidArgument({customMessage: 'Every seed document must be a JSON object'});
    }

    const {id, ...rest} = Object.fromEntries(Object.entries(item));

    if (typeof id !== 'string') {
      throw new InvalidArgument({value: id, valueObjectName: 'SeedId'});
    }

    const uuid = Uuid.fromPrimitives(id);

    return {...SeedDocumentFormatter.format(rest), _id: new UUID(uuid.toPrimitives())};
  }
}
