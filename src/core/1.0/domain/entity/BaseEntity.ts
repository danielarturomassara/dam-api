import { Nullable } from '@core/domain/type/Nullable.js';
import { Uuid } from '@core/domain/valueObject/Uuid.js';

export interface BaseEntityPrimitives {
  createdAt?: Date;
  deletedAt?: Nullable<Date>;
  id?: string;
  updatedAt?: Date;
}

export class BaseEntity {
  public createdAt: Date;
  public deletedAt: Nullable<Date>;
  public id: Uuid;
  public updatedAt: Date;

  public constructor (entity: BaseEntityPrimitives) {
    this.createdAt = entity.createdAt || new Date();
    this.deletedAt = entity.deletedAt || null;
    this.id = entity.id ? new Uuid(entity.id) : new Uuid(Uuid.create());
    this.updatedAt = entity.updatedAt || new Date();
  }

  public toPrimitives (): BaseEntityPrimitives {
    return {
      createdAt: this.createdAt,
      deletedAt: this.deletedAt,
      id: this.id.toPrimitives(),
      updatedAt: this.updatedAt
    };
  }
}
