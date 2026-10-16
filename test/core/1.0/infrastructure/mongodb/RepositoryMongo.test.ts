import {BaseEntity, BaseEntityPrimitives} from '@core/domain/entity/BaseEntity.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {MongoConnection} from '@core/infrastructure/MongoConnection.js';
import {RepositoryMongo, WithMongoId} from '@core/infrastructure/mongodb/RepositoryMongo.js';
import {Binary, UUID} from 'mongodb';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {MongoTestServer} from '../../double/MongoTestServer.js';

interface ThingPrimitives extends BaseEntityPrimitives {
  name: string;
}

class Thing extends BaseEntity {
  public static create (name: string): Thing {
    return new Thing({...BaseEntity.buildNew(), name});
  }

  public static fromPrimitives (primitives: ThingPrimitives): Thing {
    return new Thing(primitives);
  }

  public override toPrimitives (): ThingPrimitives {
    return {...super.toPrimitives(), name: this.name};
  }

  private constructor (primitives: ThingPrimitives, private readonly name: string = primitives.name) {
    super(primitives);
  }
}

class ThingRepositoryMongo extends RepositoryMongo {
  public constructor (mongoConnection: MongoConnection) {
    super(mongoConnection);
  }

  public async find (id: Uuid): Promise<null | Thing> {
    const collection = await this.getCollection<WithMongoId<ThingPrimitives>>('things');
    const document = await collection.findOne({_id: this.getObjectId(id)});

    return document ? Thing.fromPrimitives(this.fromMongo<ThingPrimitives>(document)) : null;
  }

  public async readRawId (id: Uuid): Promise<unknown> {
    const collection = await this.getCollection<WithMongoId<ThingPrimitives>>('things');
    const document = await collection.findOne({_id: this.getObjectId(id)});

    return document ? Reflect.get(document, '_id') : null;
  }

  public async save (thing: Thing): Promise<void> {
    const collection = await this.getCollection<WithMongoId<ThingPrimitives>>('things');

    await collection.insertOne(this.toMongo<ThingPrimitives>(thing));
  }
}

const mongoTestServer = new MongoTestServer('core-repository-test');

let repository: ThingRepositoryMongo;

beforeAll(async (): Promise<void> => {
  await mongoTestServer.getUri();

  repository = new ThingRepositoryMongo(mongoTestServer.buildConnection());
}, 120000);

afterAll(async (): Promise<void> => {
  await mongoTestServer.stop();
});

describe('RepositoryMongo', (): void => {
  it('round-trips an entity through toMongo/fromMongo keeping its id', async (): Promise<void> => {
    const thing = Thing.create('widget');

    await repository.save(thing);

    const foundThing = await repository.find(thing.id);

    expect(foundThing?.toPrimitives()).toStrictEqual(thing.toPrimitives());
  });

  it('stores the id as a 16-byte BSON UUID', async (): Promise<void> => {
    const thing = Thing.create('gadget');

    await repository.save(thing);

    const rawId = await repository.readRawId(thing.id);

    expect(rawId).toBeInstanceOf(Binary);
    expect((rawId as Binary).sub_type).toBe(Binary.SUBTYPE_UUID);
    expect((rawId as Binary).length()).toBe(16);
    expect(new UUID((rawId as Binary).buffer).toHexString(true)).toBe(thing.id.toPrimitives());
  });

  it('returns null for an unknown id', async (): Promise<void> => {
    await expect(repository.find(Uuid.create())).resolves.toBeNull();
  });
});
