import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface BaseEntityPrimitives {
  id: string;
}

export abstract class BaseEntity {
  public readonly id: Uuid;

  protected static buildNew (): BaseEntityPrimitives {
    return {
      id: Uuid.create().toPrimitives()
    };
  }

  public toPrimitives (): BaseEntityPrimitives {
    return {
      id: this.id.toPrimitives()
    };
  }

  protected constructor (primitives: BaseEntityPrimitives) {
    this.id = Uuid.fromPrimitives(primitives.id);
  }
}
