import {TokenRevocationRepository} from '@account/domain/TokenRevocationRepository.js';
import {TokenRevocationRepositoryMongo} from '@account/infrastructure/mongodb/TokenRevocationRepositoryMongo.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoServerError, UUID} from 'mongodb';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {MongoTestServer} from '../../../../core/1.0/double/MongoTestServer.js';
import {runTokenRevocationRepositoryContractTests} from '../../contract/runTokenRevocationRepositoryContractTests.js';

const DATABASE_NAME = 'account-token-revocation-test';

const REVOKED_TOKENS_COLLECTION = 'accountRevokedTokens';

const TOKEN_CUTOFFS_COLLECTION = 'accountTokenCutoffs';

const ISSUED_UNTIL = new Date('2026-03-01T10:00:00.000Z');

const EXPIRES_AT = new Date('2026-03-31T10:00:00.000Z');

const mongoTestServer = new MongoTestServer(DATABASE_NAME);

beforeAll(async (): Promise<void> => {
  await mongoTestServer.getUri();
}, 120000);

afterAll(async (): Promise<void> => {
  await mongoTestServer.stop();
});

const buildRepository = async (): Promise<TokenRevocationRepository> => {
  const client = await mongoTestServer.getClient();
  const database = client.db(DATABASE_NAME);

  for (const collectionName of [REVOKED_TOKENS_COLLECTION, TOKEN_CUTOFFS_COLLECTION]) {
    const existingCollectionList = await database.listCollections({name: collectionName}).toArray();

    if (existingCollectionList.length > 0) {
      await database.collection(collectionName).dropIndexes();
      await database.collection(collectionName).deleteMany({});
    }
  }

  return new TokenRevocationRepositoryMongo(mongoTestServer.buildConnection());
};

describe('TokenRevocationRepositoryMongo (port contract)', (): void => {
  runTokenRevocationRepositoryContractTests({buildRepository});
});

describe('TokenRevocationRepositoryMongo storage specifics', (): void => {
  it('stores a revoked token in accountRevokedTokens under the BSON UUID of its jti, with its expiry and nothing else', async (): Promise<void> => {
    const repository = await buildRepository();
    const tokenId = Uuid.create();

    await repository.revokeToken(tokenId, EXPIRES_AT);

    const client = await mongoTestServer.getClient();
    const storedDocumentList = await client.db(DATABASE_NAME).collection<{_id: UUID}>(REVOKED_TOKENS_COLLECTION).find({}).toArray();

    expect(storedDocumentList).toStrictEqual([{_id: new UUID(tokenId.toPrimitives()), expiresAt: EXPIRES_AT}]);
  });

  it('keeps the expiry of the first revocation when a token is revoked again', async (): Promise<void> => {
    const repository = await buildRepository();
    const tokenId = Uuid.create();

    await repository.revokeToken(tokenId, EXPIRES_AT);
    await repository.revokeToken(tokenId, new Date('2026-03-02T10:00:00.000Z'));

    const client = await mongoTestServer.getClient();
    const storedDocumentList = await client.db(DATABASE_NAME).collection<{_id: UUID}>(REVOKED_TOKENS_COLLECTION).find({}).toArray();

    expect(storedDocumentList).toStrictEqual([{_id: new UUID(tokenId.toPrimitives()), expiresAt: EXPIRES_AT}]);
  });

  it('stores one cutoff per account in accountTokenCutoffs under the BSON UUID of the account id', async (): Promise<void> => {
    const repository = await buildRepository();
    const accountId = Uuid.create();
    const laterIssuedUntil = new Date(ISSUED_UNTIL.getTime() + 60_000);
    const laterExpiresAt = new Date(EXPIRES_AT.getTime() + 60_000);

    await repository.revokeTokensOfAccount(accountId, ISSUED_UNTIL, EXPIRES_AT);
    await repository.revokeTokensOfAccount(accountId, laterIssuedUntil, laterExpiresAt);
    await repository.revokeTokensOfAccount(accountId, ISSUED_UNTIL, EXPIRES_AT);

    const client = await mongoTestServer.getClient();
    const storedDocumentList = await client.db(DATABASE_NAME).collection<{_id: UUID}>(TOKEN_CUTOFFS_COLLECTION).find({}).toArray();

    expect(storedDocumentList).toStrictEqual([{_id: new UUID(accountId.toPrimitives()), expiresAt: laterExpiresAt, issuedUntil: laterIssuedUntil}]);
  });

  it('fails the lookup while its indexes cannot be created, and recovers once they can', async (): Promise<void> => {
    const repository = await buildRepository();
    const client = await mongoTestServer.getClient();
    const revokedTokensCollection = client.db(DATABASE_NAME).collection(REVOKED_TOKENS_COLLECTION);
    const revocableToken = {accountId: Uuid.create(), issuedAt: ISSUED_UNTIL, tokenId: Uuid.create()};

    await revokedTokensCollection.createIndex({unrelatedField: 1}, {name: 'expireAtExpiresAt'});

    await expect(repository.isRevoked(revocableToken)).rejects.toBeInstanceOf(MongoServerError);
    await expect(repository.revokeToken(revocableToken.tokenId, EXPIRES_AT)).rejects.toBeInstanceOf(MongoServerError);

    await revokedTokensCollection.dropIndex('expireAtExpiresAt');

    await expect(repository.isRevoked(revocableToken)).resolves.toBe(false);
    await expect(revokedTokensCollection.indexes()).resolves.toContainEqual(expect.objectContaining({expireAfterSeconds: 0, key: {expiresAt: 1}}));
  });

  it.each([REVOKED_TOKENS_COLLECTION, TOKEN_CUTOFFS_COLLECTION])('expires the documents of %s through a constant index on expiresAt, and holds no other index than _id', async (collectionName: string): Promise<void> => {
    const repository = await buildRepository();

    await repository.revokeToken(Uuid.create(), EXPIRES_AT);
    await repository.revokeTokensOfAccount(Uuid.create(), ISSUED_UNTIL, EXPIRES_AT);

    const client = await mongoTestServer.getClient();
    const indexList = await client.db(DATABASE_NAME).collection(collectionName).indexes();

    expect(indexList.map((index) => index.key)).toStrictEqual([{_id: 1}, {expiresAt: 1}]);
    expect(indexList).toContainEqual(expect.objectContaining({expireAfterSeconds: 0, key: {expiresAt: 1}}));
  });

  it('creates the expiry indexes before the first lookup too', async (): Promise<void> => {
    const repository = await buildRepository();

    await repository.isRevoked({accountId: Uuid.create(), issuedAt: ISSUED_UNTIL, tokenId: Uuid.create()});

    const client = await mongoTestServer.getClient();
    const database = client.db(DATABASE_NAME);

    await expect(database.collection(REVOKED_TOKENS_COLLECTION).indexes()).resolves.toContainEqual(expect.objectContaining({expireAfterSeconds: 0, key: {expiresAt: 1}}));
    await expect(database.collection(TOKEN_CUTOFFS_COLLECTION).indexes()).resolves.toContainEqual(expect.objectContaining({expireAfterSeconds: 0, key: {expiresAt: 1}}));
  });

  it('serves the lookup by the _id index of each collection', async (): Promise<void> => {
    const repository = await buildRepository();
    const accountId = Uuid.create();
    const tokenId = Uuid.create();

    await repository.revokeToken(tokenId, EXPIRES_AT);
    await repository.revokeTokensOfAccount(accountId, ISSUED_UNTIL, EXPIRES_AT);

    const client = await mongoTestServer.getClient();
    const database = client.db(DATABASE_NAME);

    await database.command({profile: 0});
    await database.collection('system.profile').drop();
    await database.command({profile: 2});
    await repository.isRevoked({accountId, issuedAt: ISSUED_UNTIL, tokenId});
    await database.command({profile: 0});

    const profiledOperationList = await database.collection('system.profile').find({ns: {$in: [`${DATABASE_NAME}.${REVOKED_TOKENS_COLLECTION}`, `${DATABASE_NAME}.${TOKEN_CUTOFFS_COLLECTION}`]}}).toArray();
    const planSummaryByCollection = Object.fromEntries(profiledOperationList.map((profiledOperation) => [String(profiledOperation.ns), String(profiledOperation.planSummary)]));

    expect(Object.keys(planSummaryByCollection).sort()).toStrictEqual([`${DATABASE_NAME}.${REVOKED_TOKENS_COLLECTION}`, `${DATABASE_NAME}.${TOKEN_CUTOFFS_COLLECTION}`]);
    expect(Object.values(planSummaryByCollection)).toStrictEqual([expect.stringMatching(/ \{ _id: 1 \}$/), expect.stringMatching(/ \{ _id: 1 \}$/)]);
  });

  it('surfaces a storage failure as it is', async (): Promise<void> => {
    const repository = await buildRepository();

    await repository.revokeToken(Uuid.create(), EXPIRES_AT);

    const client = await mongoTestServer.getClient();
    const database = client.db(DATABASE_NAME);

    await database.command({collMod: REVOKED_TOKENS_COLLECTION, validator: {expiresAt: {$type: 'string'}}});

    const writeOutcome = await repository.revokeToken(Uuid.create(), EXPIRES_AT).then((): string => 'stored', (error: unknown): unknown => error);

    await database.command({collMod: REVOKED_TOKENS_COLLECTION, validator: {}});

    expect(writeOutcome).toBeInstanceOf(MongoServerError);
  });
});
