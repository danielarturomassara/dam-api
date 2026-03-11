import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface BaseEntityPrimitives {
  createdAt: Date;
  deletedAt: Nullable<Date>;
  id: string;
  updatedAt: Date;
}

export abstract class BaseEntity {
  public readonly createdAt: Date;
  public readonly deletedAt: Nullable<Date>;
  public readonly id: Uuid;
  public readonly updatedAt: Date;

  protected static buildNew (): BaseEntityPrimitives {
    const now = new Date();

    return {
      createdAt: now,
      deletedAt: null,
      id: Uuid.create().toPrimitives(),
      updatedAt: now
    };
  }

  public toPrimitives (): BaseEntityPrimitives {
    return {
      createdAt: this.createdAt,
      deletedAt: this.deletedAt,
      id: this.id.toPrimitives(),
      updatedAt: this.updatedAt
    };
  }

  protected constructor (primitives: BaseEntityPrimitives) {
    this.createdAt = primitives.createdAt;
    this.deletedAt = primitives.deletedAt;
    this.id = Uuid.fromPrimitives(primitives.id);
    this.updatedAt = primitives.updatedAt;
  }
}
