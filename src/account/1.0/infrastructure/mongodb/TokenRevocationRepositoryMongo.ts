import {RevocableToken, TokenRevocationRepository} from '@account/domain/TokenRevocationRepository.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {RepositoryMongo} from '@core/infrastructure/mongodb/RepositoryMongo.js';
import {inject, injectable} from 'inversify';
import {Collection, UUID} from 'mongodb';

interface RevokedTokenMongoDocument {
  _id: UUID;
  expiresAt: Date;
}

interface TokenCutoffMongoDocument {
  _id: UUID;
  expiresAt: Date;
  issuedUntil: Date;
}

interface TokenRevocationCollections {
  revokedTokens: Collection<RevokedTokenMongoDocument>;
  tokenCutoffs: Collection<TokenCutoffMongoDocument>;
}

const REVOKED_TOKENS_COLLECTION = 'accountRevokedTokens';

const TOKEN_CUTOFFS_COLLECTION = 'accountTokenCutoffs';

const EXPIRY_INDEX_NAME = 'expireAtExpiresAt';

@injectable()
export class TokenRevocationRepositoryMongo extends RepositoryMongo implements TokenRevocationRepository {
  private ensuredIndexes: Nullable<Promise<void>> = null;

  public constructor (@inject(MongoConnection) mongoConnection: MongoConnection) {
    super(mongoConnection);
  }

  public async isRevoked (revocableToken: RevocableToken): Promise<boolean> {
    const {revokedTokens, tokenCutoffs} = await this.getCollections();
    const [revokedTokenCount, revokingCutoffCount] = await Promise.all([
      revokedTokens.countDocuments({_id: this.getObjectId(revocableToken.tokenId)}, {limit: 1}),
      tokenCutoffs.countDocuments({_id: this.getObjectId(revocableToken.accountId), issuedUntil: {$gte: revocableToken.issuedAt}}, {limit: 1})
    ]);

    return revokedTokenCount + revokingCutoffCount > 0;
  }

  public async revokeToken (tokenId: Uuid, expiresAt: Date): Promise<void> {
    const {revokedTokens} = await this.getCollections();

    await revokedTokens.updateOne({_id: this.getObjectId(tokenId)}, {$setOnInsert: {expiresAt}}, {upsert: true});
  }

  public async revokeTokensOfAccount (accountId: Uuid, issuedUntil: Date, expiresAt: Date): Promise<void> {
    const {tokenCutoffs} = await this.getCollections();

    await tokenCutoffs.updateOne({_id: this.getObjectId(accountId)}, {$max: {expiresAt, issuedUntil}}, {upsert: true});
  }

  private async createIndexes (collections: TokenRevocationCollections): Promise<void> {
    await collections.revokedTokens.createIndex({expiresAt: 1}, {expireAfterSeconds: 0, name: EXPIRY_INDEX_NAME});
    await collections.tokenCutoffs.createIndex({expiresAt: 1}, {expireAfterSeconds: 0, name: EXPIRY_INDEX_NAME});
  }

  private async getCollections (): Promise<TokenRevocationCollections> {
    const collections = {
      revokedTokens: await this.getCollection<RevokedTokenMongoDocument>(REVOKED_TOKENS_COLLECTION),
      tokenCutoffs: await this.getCollection<TokenCutoffMongoDocument>(TOKEN_CUTOFFS_COLLECTION)
    };

    this.ensuredIndexes ??= this.createIndexes(collections).catch((indexError: unknown) => {
      this.ensuredIndexes = null;

      throw indexError;
    });

    await this.ensuredIndexes;

    return collections;
  }
}
