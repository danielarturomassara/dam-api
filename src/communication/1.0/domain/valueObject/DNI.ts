import { InvalidArgument } from '@core/domain/error/InvalidArgument.js';
import { ValueObject } from '@core/domain/valueObject/ValueObject.js';

export class DNI extends ValueObject<string> {
  public constructor (value: string) {
    super(value);

    this.ensureIsValidDni();
  }

  private ensureIsValidDni (): void {
    const regex = /^\d{7,8}$/;

    if (!regex.test(this.value)) {
      throw new InvalidArgument(`Invalid DNI: ${this.value}`);
    }
  }
}
