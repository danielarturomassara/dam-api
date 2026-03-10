import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export class Phone extends TrimmedString {
  private static readonly E164RegExp = /^\+\d{10,15}$/;
  private static readonly nonDigitsRegExp = /[\D]/g;

  public static fromPrimitives (primitives: string): Phone {
    return new Phone(primitives);
  }

  private constructor (value: string) {
    const cleanNumber = `+${value.replace(Phone.nonDigitsRegExp, '')}`;

    super(cleanNumber);

    this.ensureIsValidPhone();
  }

  private ensureIsValidPhone (): void {
    if (!Phone.E164RegExp.test(this.value)) {
      throw new InvalidArgument({value: this.value, valueObjectName: 'Phone'});
    }
  }
}
