import { ValueObject } from '@core/domain/valueObject/ValueObject.js';

export class Url extends ValueObject<string> {
  public constructor (value: string) {
    super(value);

    this.ensureIsValidUrl();
  }

  private ensureIsValidUrl (): void {
    new URL(this.value);
  }
}
