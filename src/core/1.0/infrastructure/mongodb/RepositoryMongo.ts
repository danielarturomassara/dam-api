import { BaseEntity, BaseEntityPrimitives } from '@core/domain/entity/BaseEntity.js';
import { MongoConnection } from '@core/infrastructure/MongoConnection.js';
import { inject, injectable } from 'inversify';
import { Binary, Collection, Document } from 'mongodb';
import * as uuid from 'uuid';

export type WithMongoId<T extends { id?: string }> = Omit<T, 'id'> & { _id: Binary };

@injectable()
export class RepositoryMongo {
  public constructor (@inject(MongoConnection) protected mongoConnection: MongoConnection) {}

  protected async fromMongo<BEP extends BaseEntityPrimitives> (document: WithMongoId<BEP>): Promise<BEP> {
    const { _id, ...rest } = document;

    return {
      ...rest,
      id: _id.toString()
    } as unknown as BEP;
  }

  protected async getCollection<T extends Document> (collectionName: string): Promise<Collection<T>> {
    const database = await this.mongoConnection.getDatabase();
    const collection = database.collection<T>(collectionName);

    return collection;
  }

  protected async toMongo<BE extends BaseEntity, BEP extends BaseEntityPrimitives = ReturnType<BE['toPrimitives']>> (entity: BE): Promise<WithMongoId<BEP>> {
    const { id, ...rest } = entity.toPrimitives();
    const uuidBuffer = Buffer.from(uuid.parse(id!));

    const mongoId = new Binary(uuidBuffer, Binary.SUBTYPE_UUID);

    return {
      ...rest as Omit<BEP, 'id'>,
      _id: mongoId
    };
  }
}
