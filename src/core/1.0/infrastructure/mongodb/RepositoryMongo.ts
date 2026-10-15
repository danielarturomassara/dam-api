import {BaseEntityPrimitives} from '@core/domain/entity/BaseEntity.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {inject, injectable} from 'inversify';
import {Binary, Collection, Document, UUID} from 'mongodb';

export type WithMongoId<PRIMITIVES extends BaseEntityPrimitives> = Omit<PRIMITIVES, 'id'> & { _id: UUID };

interface PrimitivesSource<PRIMITIVES extends BaseEntityPrimitives> {
  toPrimitives (): PRIMITIVES;
}

@injectable()
export class RepositoryMongo {
  public constructor (@inject(MongoConnection) protected readonly mongoConnection: MongoConnection) {}

  protected fromMongo<PRIMITIVES extends BaseEntityPrimitives> (document: WithMongoId<PRIMITIVES>): PRIMITIVES {
    const {_id, ...rest} = document;

    return {...rest, id: this.toUuidText(_id)} as unknown as PRIMITIVES;
  }

  protected async getCollection<DOCUMENT extends Document> (collectionName: string): Promise<Collection<DOCUMENT>> {
    const database = await this.mongoConnection.getDatabase();

    return database.collection<DOCUMENT>(collectionName);
  }

  protected getObjectId (id: Uuid): UUID {
    return new UUID(id.toPrimitives());
  }

  protected toMongo<PRIMITIVES extends BaseEntityPrimitives> (entity: PrimitivesSource<PRIMITIVES>): WithMongoId<PRIMITIVES> {
    const {id, ...rest} = entity.toPrimitives();

    return {...rest, _id: this.getObjectId(Uuid.fromPrimitives(id))};
  }

  private toUuidText (mongoId: Binary): string {
    const uuid = mongoId instanceof UUID ? mongoId : mongoId.toUUID();

    return uuid.toHexString(true);
  }
}
