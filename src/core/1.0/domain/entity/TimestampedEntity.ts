import {BaseEntity, BaseEntityPrimitives} from '@core/domain/entity/BaseEntity.js';

export interface TimestampedEntityPrimitives extends BaseEntityPrimitives {
  createdAt: Date;
  updatedAt: Date;
}

export abstract class TimestampedEntity extends BaseEntity {
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  protected static override buildNew (): TimestampedEntityPrimitives {
    const now = new Date();

    return {
      ...super.buildNew(),
      createdAt: now,
      updatedAt: now
    };
  }

  public override toPrimitives (): TimestampedEntityPrimitives {
    return {
      ...super.toPrimitives(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  protected constructor (primitives: TimestampedEntityPrimitives) {
    super(primitives);

    this.createdAt = primitives.createdAt;
    this.updatedAt = primitives.updatedAt;
  }
}
