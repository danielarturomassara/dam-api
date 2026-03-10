import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export interface NamesPrimitives {
  family: string;
  given: string;
}

export class Names {
  public readonly family: TrimmedString;
  public readonly given: TrimmedString;

  public static fromPrimitives (primitives: NamesPrimitives): Names {
    return new Names(primitives);
  }

  public toPrimitives (): NamesPrimitives {
    return {
      family: this.family.toPrimitives(),
      given: this.given.toPrimitives()
    };
  }

  private constructor (primitives: NamesPrimitives) {
    this.given = TrimmedString.fromPrimitives(primitives.given);
    this.family = TrimmedString.fromPrimitives(primitives.family);

    if (this.given.isEmptyString() || this.family.isEmptyString()) {
      throw new InvalidArgument({customMessage: '<Names> does not allow empty strings'});
    }
  }
}
