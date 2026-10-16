import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export class Phone extends TrimmedString {
  private static readonly e164RegExp = /^\+\d{7,15}$/;

  public static fromPrimitives (primitives: string): Phone {
    return new Phone(primitives);
  }

  private constructor (value: string) {
    super(value);

    this.ensureIsValidPhone();
  }

  private ensureIsValidPhone (): void {
    if (!Phone.e164RegExp.test(this.value)) {
      throw new InvalidArgument({value: this.value, valueObjectName: this.constructor.name});
    }
  }
}
