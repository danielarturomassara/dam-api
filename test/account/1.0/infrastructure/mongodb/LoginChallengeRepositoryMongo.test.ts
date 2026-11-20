import {LoginChallenge} from '@account/domain/entity/LoginChallenge.js';
import {LoginChallengeRepository} from '@account/domain/LoginChallengeRepository.js';
import {LoginChallengeRepositoryMongo} from '@account/infrastructure/mongodb/LoginChallengeRepositoryMongo.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoServerError, UUID} from 'mongodb';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {MongoTestServer} from '../../../../core/1.0/double/MongoTestServer.js';
import {runLoginChallengeRepositoryContractTests} from '../../contract/runLoginChallengeRepositoryContractTests.js';
import {buildLoginChallenge} from '../../double/loginFixtures.js';

const DATABASE_NAME = 'account-login-challenge-test';

const COLLECTION_NAME = 'accountLoginChallenges';

const mongoTestServer = new MongoTestServer(DATABASE_NAME);

beforeAll(async (): Promise<void> => {
  await mongoTestServer.getUri();
}, 120000);

afterAll(async (): Promise<void> => {
  await mongoTestServer.stop();
});

const buildRepository = async (): Promise<LoginChallengeRepository> => {
  const client = await mongoTestServer.getClient();
  const database = client.db(DATABASE_NAME);
  const existingCollectionList = await database.listCollections({name: COLLECTION_NAME}).toArray();

  if (existingCollectionList.length > 0) {
    await database.collection(COLLECTION_NAME).dropIndexes();
    await database.collection(COLLECTION_NAME).deleteMany({});
  }

  return new LoginChallengeRepositoryMongo(mongoTestServer.buildConnection());
};

describe('LoginChallengeRepositoryMongo (port contract)', (): void => {
  runLoginChallengeRepositoryContractTests({buildRepository});
});

describe('LoginChallengeRepositoryMongo storage specifics', (): void => {
  it('stores the challenge in accountLoginChallenges under the BSON UUID of its id', async (): Promise<void> => {
    const repository = await buildRepository();
    const challenge = buildLoginChallenge(Uuid.create(), new Date());

    await repository.create(challenge);

    const client = await mongoTestServer.getClient();
    const storedDocument = await client.db(DATABASE_NAME).collection<{_id: UUID}>(COLLECTION_NAME).findOne({_id: new UUID(challenge.id.toPrimitives())});

    expect(storedDocument).toMatchObject({
      accountId: challenge.accountId.toPrimitives(),
      attemptCount: 0,
      codeHash: challenge.codeHash.toPrimitives(),
      consumedAt: null,
      provider: 'phone',
      supersededChallengeId: null
    });
    expect(storedDocument).not.toHaveProperty('id');
  });

  it('expires challenges through a constant index on expiresAt and serves the latest lookup by an index', async (): Promise<void> => {
    const repository = await buildRepository();

    await repository.create(buildLoginChallenge(Uuid.create(), new Date()));

    const client = await mongoTestServer.getClient();
    const indexList = await client.db(DATABASE_NAME).collection(COLLECTION_NAME).indexes();

    expect(indexList).toContainEqual(expect.objectContaining({expireAfterSeconds: 0, key: {expiresAt: 1}}));

    const latestLookupIndex = indexList.find((index) => index.name === 'latestByAccountAndProvider');

    expect(Object.entries(latestLookupIndex?.key ?? {})).toStrictEqual([['accountId', 1], ['provider', 1], ['createdAt', -1]]);
  });

  it('enforces one challenge per account, provider and superseded challenge through a unique index', async (): Promise<void> => {
    const repository = await buildRepository();

    await repository.create(buildLoginChallenge(Uuid.create(), new Date()));

    const client = await mongoTestServer.getClient();
    const indexList = await client.db(DATABASE_NAME).collection(COLLECTION_NAME).indexes();

    expect(indexList).toContainEqual(expect.objectContaining({key: {accountId: 1, provider: 1, supersededChallengeId: 1}, unique: true}));
  });

  it('surfaces a storage failure that is not a duplicate as it is', async (): Promise<void> => {
    const repository = await buildRepository();
    const challenge = buildLoginChallenge(Uuid.create(), new Date());

    await repository.create(challenge);

    const client = await mongoTestServer.getClient();

    await client.db(DATABASE_NAME).command({collMod: COLLECTION_NAME, validator: {attemptCount: {$lt: 0}}});

    const outcome = await repository.create(buildLoginChallenge(Uuid.create(), new Date())).then((): string => 'stored', (error: unknown): unknown => error);

    await client.db(DATABASE_NAME).command({collMod: COLLECTION_NAME, validator: {}});

    expect(outcome).toBeInstanceOf(MongoServerError);
  });

  it('surfaces a duplicate id as the storage error it is, never as a superseded challenge', async (): Promise<void> => {
    const repository = await buildRepository();
    const challenge = buildLoginChallenge(Uuid.create(), new Date());
    const sameIdChallenge = LoginChallenge.fromPrimitives({...buildLoginChallenge(Uuid.create(), new Date()).toPrimitives(), id: challenge.id.toPrimitives()});

    await repository.create(challenge);

    await expect(repository.create(sameIdChallenge)).rejects.toBeInstanceOf(MongoServerError);
  });
});
