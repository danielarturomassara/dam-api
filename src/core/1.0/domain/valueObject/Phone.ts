import { InvalidArgument } from '@core/domain/error/InvalidArgument.js';
import { ValueObject } from '@core/domain/valueObject/ValueObject.js';

export class Phone extends ValueObject<string> {
  public constructor (value: string) {
    let cleanNumber = value.replace(/[^+\d]/g, '');

    if (!cleanNumber.startsWith('+')) {
      cleanNumber = `+${ cleanNumber }`;
    }

    super(cleanNumber);

    this.ensureIsValidPhone();
  }

  private ensureIsValidPhone (): void {
    const validRegExp = new RegExp(/^[+]?\d+$/);

    if (!validRegExp.test(this.value)) {
      throw new InvalidArgument(`<${ this.constructor.name }> does not allow the value <${ this.value }>`);
    }
  }
}
