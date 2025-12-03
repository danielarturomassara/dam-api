import { ValueObject } from '@core/domain/valueObject/ValueObject.js';

export class TrimmedString extends ValueObject<string> {
  public constructor (value: string) {
    super(value.trim());
  }
}
