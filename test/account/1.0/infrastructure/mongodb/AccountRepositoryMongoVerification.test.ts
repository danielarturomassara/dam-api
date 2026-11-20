import {AccountRepository} from '@account/domain/AccountRepository.js';
import {AccountRepositoryMongo} from '@account/infrastructure/mongodb/AccountRepositoryMongo.js';
import {afterAll, beforeAll, describe} from 'vitest';

import {MongoTestServer} from '../../../../core/1.0/double/MongoTestServer.js';
import {runAccountVerificationPersistenceContractTests} from '../../contract/runAccountVerificationPersistenceContractTests.js';

const DATABASE_NAME = 'account-verification-contract-test';

const mongoTestServer = new MongoTestServer(DATABASE_NAME);

beforeAll(async (): Promise<void> => {
  await mongoTestServer.getUri();
}, 120000);

afterAll(async (): Promise<void> => {
  await mongoTestServer.stop();
});

const buildRepository = async (): Promise<AccountRepository> => {
  const client = await mongoTestServer.getClient();
  const database = client.db(DATABASE_NAME);
  const existingCollectionList = await database.listCollections({name: 'accounts'}).toArray();

  if (existingCollectionList.length > 0) {
    await database.collection('accounts').dropIndexes();
    await database.collection('accounts').deleteMany({});
  }

  return new AccountRepositoryMongo(mongoTestServer.buildConnection());
};

describe('AccountRepositoryMongo (verification persistence contract)', (): void => {
  runAccountVerificationPersistenceContractTests({buildRepository});
});
