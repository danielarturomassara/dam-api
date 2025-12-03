import { Config } from '@core/Config.js';
import { Logger, LOGGER } from '@core/domain/Logger.js';
import { MongoConnection } from '@core/infrastructure/MongoConnection.js';
import fs from 'fs';
import { glob } from 'glob';
import { inject, injectable } from 'inversify';
import * as mongodb from 'mongodb';

@injectable()
export class DataSeeder {
  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger,
    @inject(MongoConnection) private mongoConnection: MongoConnection
  ) {}

  public async populate (): Promise<void> {
    if (this.config.getNodeEnvironment() === 'production') {
      return;
    }

    const jsonFiles = await glob('**/mongodb/seed/*.json');

    for (const jsonFile of jsonFiles) {
      const filename = jsonFile.split('/').pop();

      if (filename) {
        this.logger.info(`Found seed file: ${ filename }`);

        const collectionName = filename.replace('.json', '').replace('.csv', '');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fileContents: Array<any> = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));

        this.logger.info(`${ filename } contains ${ fileContents.length } documents.`);

        const documentsToInsert = fileContents.map(item => {
          if (item.id) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...rest } = item;

            rest['_id'] = new mongodb.UUID(item.id);

            return this.formatFields(rest);
          }

          return this.formatFields(item);
        });

        const collection = await this.getCollection(collectionName);

        this.logger.info(`Dropping ${ collectionName } collection...`);
        await collection.drop();

        this.logger.info(`Inserting ${ documentsToInsert.length } documents into ${ collectionName } collection...`);
        await collection.insertMany(documentsToInsert);

        this.logger.info(`Collection ${ collectionName } seeded successfully.`);
      }
    }

    await this.mongoConnection.disconnect();

    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatFields (document: any): any {
    for (const field in document) {
      if (document[field] === null || document[field] === undefined) {
        document[field] = null;

        continue;
      }

      const fieldType = typeof document[field];

      if (fieldType === 'object') {
        const keys = Object.keys(document[field]);

        if ((field === 'created_at' || field === 'updated_at') && keys.includes('$numberLong')) {
          document[field] = new Date(document[field].$numberLong);
        }

        if (keys.includes('$date')) {
          document[field] = new Date(document[field].$date);
        }

        this.formatFields(document[field]);
      }
    }

    return document;
  }

  private async getCollection (collectionName: string): Promise<mongodb.Collection> {
    const database = await this.mongoConnection.getDatabase();

    const collection = database.collection(collectionName);

    return collection;
  }
}
