import {TimestampedEntity, TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {Nullable} from '@core/domain/type/Nullable.js';

export interface AuditedEntityPrimitives extends TimestampedEntityPrimitives {
  deletedAt: Nullable<Date>;
}

export abstract class AuditedEntity extends TimestampedEntity {
  #deletedAt: Nullable<Date>;

  protected static override buildNew (): AuditedEntityPrimitives {
    return {
      ...super.buildNew(),
      deletedAt: null
    };
  }

  public delete (): void {
    if (this.#deletedAt) {
      throw new Conflict('Entity is already deleted');
    }

    this.#deletedAt = new Date();
  }

  public isDeleted (): boolean {
    return this.#deletedAt !== null;
  }

  public restore (): void {
    this.#deletedAt = null;
  }

  public override toPrimitives (): AuditedEntityPrimitives {
    return {
      ...super.toPrimitives(),
      deletedAt: this.#deletedAt
    };
  }

  protected constructor (primitives: AuditedEntityPrimitives) {
    super(primitives);

    this.#deletedAt = primitives.deletedAt;
  }
}
