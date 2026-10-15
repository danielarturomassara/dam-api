import {AuditedEntity, AuditedEntityPrimitives} from '@core/domain/entity/AuditedEntity.js';
import {BaseEntity, BaseEntityPrimitives} from '@core/domain/entity/BaseEntity.js';
import {TimestampedEntity, TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {describe, expect, it} from 'vitest';

class AuditedThing extends AuditedEntity {
  public static create (): AuditedThing {
    return new AuditedThing(AuditedEntity.buildNew());
  }

  public static fromPrimitives (primitives: AuditedEntityPrimitives): AuditedThing {
    return new AuditedThing(primitives);
  }

  private constructor (primitives: AuditedEntityPrimitives) {
    super(primitives);
  }
}

class PlainThing extends BaseEntity {
  public static create (): PlainThing {
    return new PlainThing(BaseEntity.buildNew());
  }

  public static fromPrimitives (primitives: BaseEntityPrimitives): PlainThing {
    return new PlainThing(primitives);
  }

  private constructor (primitives: BaseEntityPrimitives) {
    super(primitives);
  }
}

class TimestampedThing extends TimestampedEntity {
  public static create (): TimestampedThing {
    return new TimestampedThing(TimestampedEntity.buildNew());
  }

  public static fromPrimitives (primitives: TimestampedEntityPrimitives): TimestampedThing {
    return new TimestampedThing(primitives);
  }

  private constructor (primitives: TimestampedEntityPrimitives) {
    super(primitives);
  }
}

describe('BaseEntity', (): void => {
  it('creates a new entity with a generated uuid and round-trips it', (): void => {
    const thing = PlainThing.create();
    const primitives = thing.toPrimitives();

    expect(primitives.id).toBe(thing.id.toPrimitives());
    expect(PlainThing.fromPrimitives(primitives).toPrimitives()).toStrictEqual(primitives);
  });

  it('refuses an invalid id on hydration', (): void => {
    expect((): unknown => PlainThing.fromPrimitives({id: 'not-a-uuid'})).toThrow(InvalidArgument);
  });
});

describe('TimestampedEntity', (): void => {
  it('is created with equal createdAt and updatedAt', (): void => {
    const primitives = TimestampedThing.create().toPrimitives();

    expect(primitives.createdAt).toBeInstanceOf(Date);
    expect(primitives.updatedAt).toStrictEqual(primitives.createdAt);
  });

  it('round-trips its timestamps', (): void => {
    const createdAt = new Date('2026-01-05T10:00:00.000Z');
    const updatedAt = new Date('2026-01-06T10:00:00.000Z');
    const primitives = {...PlainThing.create().toPrimitives(), createdAt, updatedAt};

    expect(TimestampedThing.fromPrimitives(primitives).toPrimitives()).toStrictEqual(primitives);
  });
});

describe('AuditedEntity', (): void => {
  it('starts undeleted', (): void => {
    const thing = AuditedThing.create();

    expect(thing.isDeleted()).toBe(false);
    expect(thing.toPrimitives().deletedAt).toBeNull();
  });

  it('deletes once and refuses a second delete', (): void => {
    const thing = AuditedThing.create();

    thing.delete();

    expect(thing.isDeleted()).toBe(true);
    expect(thing.toPrimitives().deletedAt).toBeInstanceOf(Date);
    expect((): void => thing.delete()).toThrow(Conflict);
    expect((): void => thing.delete()).toThrow('Conflict: Entity is already deleted.');
  });

  it('changes deletedAt only through its methods', (): void => {
    const thing = AuditedThing.create();

    // @ts-expect-error deletedAt is not assignable from outside the entity
    thing.deletedAt = new Date();

    expect(thing.isDeleted()).toBe(false);
  });

  it('restores any number of times without complaint', (): void => {
    const thing = AuditedThing.create();

    thing.delete();
    thing.restore();
    thing.restore();

    expect(thing.isDeleted()).toBe(false);
    expect(thing.toPrimitives().deletedAt).toBeNull();
  });
});
