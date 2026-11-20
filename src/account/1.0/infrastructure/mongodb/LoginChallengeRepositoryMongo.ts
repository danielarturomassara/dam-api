import {LoginChallenge, LoginChallengePrimitives} from '@account/domain/entity/LoginChallenge.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {LoginChallengeRepository} from '@account/domain/LoginChallengeRepository.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {RepositoryMongo, WithMongoId} from '@core/infrastructure/mongodb/RepositoryMongo.js';
import {inject, injectable} from 'inversify';
import {Collection, MongoServerError} from 'mongodb';

type LoginChallengeMongoDocument = WithMongoId<LoginChallengePrimitives>;

const LOGIN_CHALLENGES_COLLECTION = 'accountLoginChallenges';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

const SUPERSEDED_CHALLENGE_FIELD = 'supersededChallengeId';

// eslint-disable-next-line perfectionist/sort-maps
const LATEST_LOOKUP_INDEX_KEYS = new Map<string, -1 | 1>([['accountId', 1], ['provider', 1], ['createdAt', -1]]);

@injectable()
export class LoginChallengeRepositoryMongo extends RepositoryMongo implements LoginChallengeRepository {
  private ensuredIndexes: Nullable<Promise<void>> = null;

  public constructor (@inject(MongoConnection) mongoConnection: MongoConnection) {
    super(mongoConnection);
  }

  public async claimAttempt (id: Uuid, maximumAttempts: number): Promise<void> {
    const collection = await this.getLoginChallengesCollection();
    const now = new Date();
    const updateResult = await collection.updateOne(
      {_id: this.getObjectId(id), attemptCount: {$lt: maximumAttempts}, consumedAt: null, expiresAt: {$gt: now}},
      {$inc: {attemptCount: 1}}
    );

    if (updateResult.modifiedCount === 0) {
      throw new Conflict('Login challenge attempt');
    }
  }

  public async consume (id: Uuid): Promise<void> {
    const collection = await this.getLoginChallengesCollection();
    const updateResult = await collection.updateOne({_id: this.getObjectId(id), consumedAt: null}, {$set: {consumedAt: new Date()}});

    if (updateResult.modifiedCount === 0) {
      throw new Conflict('Login challenge is already consumed');
    }
  }

  public async create (loginChallenge: LoginChallenge): Promise<void> {
    const collection = await this.getLoginChallengesCollection();

    try {
      await collection.insertOne(this.toMongo<LoginChallengePrimitives>(loginChallenge));
    } catch (error) {
      if (this.isSupersededChallengeDuplicate(error)) {
        throw new Conflict('Login challenge was already superseded');
      }

      throw error;
    }
  }

  public async findLatestByAccount (accountId: Uuid, provider: IDENTITY_PROVIDERS): Promise<Nullable<LoginChallenge>> {
    const collection = await this.getLoginChallengesCollection();
    const document = await collection.findOne({accountId: accountId.toPrimitives(), provider}, {sort: {createdAt: -1}});

    if (!document) {
      return null;
    }

    return LoginChallenge.fromPrimitives(this.fromMongo<LoginChallengePrimitives>(document));
  }

  private async createIndexes (collection: Collection<LoginChallengeMongoDocument>): Promise<void> {
    await collection.createIndex({expiresAt: 1}, {expireAfterSeconds: 0, name: 'expireAtExpiresAt'});
    await collection.createIndex(LATEST_LOOKUP_INDEX_KEYS, {name: 'latestByAccountAndProvider'});
    await collection.createIndex({accountId: 1, provider: 1, supersededChallengeId: 1}, {name: 'uniqueSupersededChallenge', unique: true});
  }

  private isSupersededChallengeDuplicate (error: unknown): boolean {
    if (!(error instanceof MongoServerError) || error.code !== MONGO_DUPLICATE_KEY_ERROR_CODE) {
      return false;
    }

    const violatedKeyPattern: unknown = Reflect.get(error, 'keyPattern');

    return typeof violatedKeyPattern === 'object' && violatedKeyPattern !== null && Object.hasOwn(violatedKeyPattern, SUPERSEDED_CHALLENGE_FIELD);
  }

  private async getLoginChallengesCollection (): Promise<Collection<LoginChallengeMongoDocument>> {
    const collection = await this.getCollection<LoginChallengeMongoDocument>(LOGIN_CHALLENGES_COLLECTION);

    this.ensuredIndexes ??= this.createIndexes(collection).catch((indexError: unknown) => {
      this.ensuredIndexes = null;

      throw indexError;
    });

    await this.ensuredIndexes;

    return collection;
  }
}
