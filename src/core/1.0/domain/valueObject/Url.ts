import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export class Url extends TrimmedString {
  public static fromPrimitives (primitives: string): Url {
    return new Url(primitives);
  }

  private constructor (value: string) {
    super(value);

    this.ensureIsValidUrl();
  }

  private ensureIsValidUrl (): void {
    if (!URL.canParse(this.value)) {
      throw new InvalidArgument({value: this.value, valueObjectName: this.constructor.name});
    }
  }
}
