import {AccountRepository} from '@account/domain/AccountRepository.js';
import {Account, AccountPrimitives} from '@account/domain/entity/Account.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {RepositoryMongo} from '@core/infrastructure/mongodb/RepositoryMongo.js';
import {Binary} from 'mongodb';

type AccountMongoDocument = Omit<AccountPrimitives, 'id'> & { _id: Binary };

export class AccountRepositoryMongo extends RepositoryMongo implements AccountRepository {
  public async create (account: Account): Promise<void> {
    const collection = await this.getCollection<AccountMongoDocument>('accounts');

    const mongoAccount = await this.toMongo(account);

    await collection.insertOne(mongoAccount);
  }

  public async delete (id: Uuid): Promise<void> {
    const collection = await this.getCollection<AccountMongoDocument>('accounts');

    const mongoId = this.getObjectId(id);

    await collection.deleteOne({_id: mongoId});
  }

  public async findByEmail (email: Email): Promise<Nullable<Account>> {
    const collection = await this.getCollection<AccountMongoDocument>('accounts');

    const document = await collection.findOne({email: email});

    if (!document) {
      return null;
    }

    const primitives = await this.fromMongo<AccountPrimitives>(document);

    return Account.fromPrimitives(primitives);
  }

  public async findByPhone (phone: Phone): Promise<Nullable<Account>> {
    const collection = await this.getCollection<AccountMongoDocument>('accounts');

    const document = await collection.findOne({phone: phone});

    if (!document) {
      return null;
    }

    const primitives = await this.fromMongo<AccountPrimitives>(document);

    return Account.fromPrimitives(primitives);
  }

  public async findById (id: Uuid): Promise<Nullable<Account>> {
    const collection = await this.getCollection<AccountMongoDocument>('accounts');

    const mongoId = this.getObjectId(id);
    const document = await collection.findOne({_id: mongoId});

    if (!document) {
      return null;
    }

    const primitives = await this.fromMongo<AccountPrimitives>(document);

    return Account.fromPrimitives(primitives);
  }

  public async update (account: Account): Promise<void> {
    const collection = await this.getCollection<AccountMongoDocument>('accounts');

    const mongoId = this.getObjectId(account.id);

    await collection.updateOne({
      _id: mongoId
    }, {
      $set: await this.toMongo(account)
    });
  }
}
