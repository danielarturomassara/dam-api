import {ValueObject} from '@core/domain/valueObject/ValueObject.js';

export class TrimmedString extends ValueObject<string> {
  public static fromPrimitives (primitives: string): TrimmedString {
    return new TrimmedString(primitives);
  }

  public isEmptyString (): boolean {
    return this.value.length === 0;
  }

  protected constructor (value: string) {
    super(value.trim());
  }
}
