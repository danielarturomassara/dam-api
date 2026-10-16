import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {ValueObject} from '@core/domain/valueObject/ValueObject.js';

export class TrimmedString extends ValueObject<string> {
  public static fromPrimitives (primitives: string): TrimmedString {
    return new TrimmedString(primitives);
  }

  public isEmptyString (): boolean {
    return this.value.length === 0;
  }

  protected constructor (value: string) {
    super(typeof value === 'string' ? value.trim() : value);

    this.ensureIsString();
  }

  private ensureIsString (): void {
    if (typeof this.value !== 'string') {
      throw new InvalidArgument({value: this.value, valueObjectName: this.constructor.name});
    }
  }
}
