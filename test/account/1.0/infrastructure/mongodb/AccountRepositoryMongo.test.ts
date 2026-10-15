import {AccountRepository} from '@account/domain/AccountRepository.js';
import {Account, AccountPrimitives} from '@account/domain/entity/Account.js';
import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {AccountRepositoryMongo} from '@account/infrastructure/mongodb/AccountRepositoryMongo.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoServerError} from 'mongodb';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {MongoTestServer} from '../../../../core/1.0/double/MongoTestServer.js';
import {runAccountRepositoryContractTests} from '../../contract/runAccountRepositoryContractTests.js';
import {buildEmailAccount, buildGoogleIdentity, buildPasswordIdentity, buildPhoneIdentity} from '../../double/accountFixtures.js';

const mongoTestServer = new MongoTestServer('account-contract-test');

beforeAll(async (): Promise<void> => {
  await mongoTestServer.getUri();
}, 120000);

afterAll(async (): Promise<void> => {
  await mongoTestServer.stop();
});

// dropIndexes clears index definitions left behind by earlier runs (the adapter re-creates the
// current ones on first use), so an index redesign never collides with a stale test database.
const buildRepository = async (): Promise<AccountRepository> => {
  const client = await mongoTestServer.getClient();
  const database = client.db('account-contract-test');
  const existingCollectionList = await database.listCollections({name: 'accounts'}).toArray();

  if (existingCollectionList.length > 0) {
    await database.collection('accounts').dropIndexes();
    await database.collection('accounts').deleteMany({});
  }

  return new AccountRepositoryMongo(mongoTestServer.buildConnection());
};

const buildMixedIdentityAccountPrimitives = (email: string, phone: string): AccountPrimitives => {
  const creationDate = new Date('2026-01-05T10:00:00.000Z');

  return {
    createdAt: creationDate,
    disabledAt: null,
    id: Uuid.create().toPrimitives(),
    identities: [buildPasswordIdentity().toPrimitives(), buildPhoneIdentity().toPrimitives(), buildGoogleIdentity(email).toPrimitives()],
    primaryEmail: email,
    primaryPhone: phone,
    updatedAt: creationDate
  };
};

describe('AccountRepositoryMongo (port contract)', (): void => {
  runAccountRepositoryContractTests({buildRepository});
});

describe('AccountRepositoryMongo storage specifics', (): void => {
  it('accepts distinct accounts holding mixed identity sets and still rejects a duplicate oauth email', async (): Promise<void> => {
    const repository = await buildRepository();

    await repository.create(Account.fromPrimitives(buildMixedIdentityAccountPrimitives('first@example.com', '+34600111222')));
    await repository.create(Account.fromPrimitives(buildMixedIdentityAccountPrimitives('second@example.com', '+34600333444')));

    const thirdAccountPrimitives = buildMixedIdentityAccountPrimitives('third@example.com', '+34600555666');
    const identityEmailCollision = {...thirdAccountPrimitives, identities: [buildGoogleIdentity('first@example.com').toPrimitives()]};

    await expect(repository.create(Account.fromPrimitives(identityEmailCollision))).rejects.toThrow('Conflict: email.');
  });

  it('rethrows a non-contact duplicate key error instead of masking it as a DuplicateContact', async (): Promise<void> => {
    const repository = await buildRepository();
    const account = buildEmailAccount('someone@example.com');

    await repository.create(account);

    const sameIdAccount = Account.fromPrimitives({...account.toPrimitives(), primaryEmail: 'someone.else@example.com'});

    await expect(repository.create(sameIdAccount)).rejects.toThrow(MongoServerError);
    await expect(repository.create(sameIdAccount)).rejects.not.toThrow(DuplicateContact);
  });
});
