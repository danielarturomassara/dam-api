import {AccountRepository} from '@account/domain/AccountRepository.js';
import {Account, AccountPrimitives} from '@account/domain/entity/Account.js';
import {DuplicateContact, DuplicateContactResource} from '@account/domain/error/DuplicateContact.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {RepositoryMongo, WithMongoId} from '@core/infrastructure/mongodb/RepositoryMongo.js';
import {inject, injectable} from 'inversify';
import {Collection, MongoServerError} from 'mongodb';

type AccountMongoDocument = WithMongoId<AccountPrimitives> & {contactEmails: Array<string>};

const ACCOUNTS_COLLECTION = 'accounts';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

const DUPLICATE_CONTACT_RESOURCE_BY_INDEX_KEY = {
  contactEmails: 'email',
  primaryPhone: 'phone'
} satisfies Record<string, DuplicateContactResource>;

@injectable()
export class AccountRepositoryMongo extends RepositoryMongo implements AccountRepository {
  private ensuredIndexes: Nullable<Promise<void>> = null;

  public constructor (@inject(MongoConnection) mongoConnection: MongoConnection) {
    super(mongoConnection);
  }

  public async create (account: Account): Promise<void> {
    const collection = await this.getAccountsCollection();

    try {
      await collection.insertOne(this.toAccountDocument(account));
    } catch (error) {
      this.throwTranslatedDuplicateKeyError(error);
    }
  }

  public async delete (id: Uuid): Promise<void> {
    const collection = await this.getAccountsCollection();

    await collection.deleteOne({_id: this.getObjectId(id)});
  }

  public async findByEmail (email: Email): Promise<Nullable<Account>> {
    const collection = await this.getAccountsCollection();

    return this.toAccount(await collection.findOne({contactEmails: email.toPrimitives()}));
  }

  public async findById (id: Uuid): Promise<Nullable<Account>> {
    const collection = await this.getAccountsCollection();

    return this.toAccount(await collection.findOne({_id: this.getObjectId(id)}));
  }

  public async findByPhone (phone: Phone): Promise<Nullable<Account>> {
    const collection = await this.getAccountsCollection();

    return this.toAccount(await collection.findOne({primaryPhone: phone.toPrimitives()}));
  }

  public async update (account: Account): Promise<void> {
    const collection = await this.getAccountsCollection();
    const {_id, ...accountFields} = this.toAccountDocument(account);

    try {
      const updateResult = await collection.updateOne({_id}, {$set: accountFields});

      if (updateResult.matchedCount === 0) {
        throw new NotFound('Account');
      }
    } catch (error) {
      this.throwTranslatedDuplicateKeyError(error);
    }
  }

  private buildContactEmails (primitives: AccountPrimitives): Array<string> {
    const identityEmails = primitives.identities
      .map((identity) => identity.email)
      .filter((identityEmail): identityEmail is string => typeof identityEmail === 'string');
    const contactEmails = primitives.primaryEmail === null ? identityEmails : [primitives.primaryEmail, ...identityEmails];

    return [...new Set(contactEmails)];
  }

  private async createUniqueContactIndexes (collection: Collection<AccountMongoDocument>): Promise<void> {
    await collection.createIndex({contactEmails: 1}, {name: 'uniqueContactEmails', partialFilterExpression: {contactEmails: {$type: 'string'}}, unique: true});
    await collection.createIndex({primaryPhone: 1}, {name: 'uniquePrimaryPhone', partialFilterExpression: {primaryPhone: {$type: 'string'}}, unique: true});
  }

  private async getAccountsCollection (): Promise<Collection<AccountMongoDocument>> {
    const collection = await this.getCollection<AccountMongoDocument>(ACCOUNTS_COLLECTION);

    this.ensuredIndexes ??= this.createUniqueContactIndexes(collection).catch((indexError: unknown) => {
      this.ensuredIndexes = null;

      throw indexError;
    });

    await this.ensuredIndexes;

    return collection;
  }

  private getDuplicateContactResource (keyPattern: object): Nullable<DuplicateContactResource> {
    const indexKey = Object.keys(DUPLICATE_CONTACT_RESOURCE_BY_INDEX_KEY).find((keyName) => Object.hasOwn(keyPattern, keyName));

    if (indexKey === undefined) {
      return null;
    }

    return DUPLICATE_CONTACT_RESOURCE_BY_INDEX_KEY[indexKey as keyof typeof DUPLICATE_CONTACT_RESOURCE_BY_INDEX_KEY];
  }

  private throwTranslatedDuplicateKeyError (error: unknown): never {
    if (!(error instanceof MongoServerError) || error.code !== MONGO_DUPLICATE_KEY_ERROR_CODE) {
      throw error;
    }

    const keyPattern: unknown = Reflect.get(error, 'keyPattern');
    const duplicateContactResource = typeof keyPattern === 'object' && keyPattern !== null ? this.getDuplicateContactResource(keyPattern) : null;

    if (!duplicateContactResource) {
      throw error;
    }

    throw new DuplicateContact(duplicateContactResource);
  }

  private toAccount (document: Nullable<AccountMongoDocument>): Nullable<Account> {
    if (!document) {
      return null;
    }

    return Account.fromPrimitives(this.fromMongo<AccountPrimitives>(document));
  }

  private toAccountDocument (account: Account): AccountMongoDocument {
    const primitives = account.toPrimitives();

    return {...this.toMongo<AccountPrimitives>(account), contactEmails: this.buildContactEmails(primitives)};
  }
}
