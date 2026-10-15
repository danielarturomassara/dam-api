import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';
import {randomInt} from 'crypto';

export class VerificationCode extends TrimmedString {
  private static readonly digitsOnlyRegExp = /^\d+$/;

  public static fromPrimitives (primitives: string): VerificationCode {
    return new VerificationCode(primitives);
  }

  public static generate (length: number): VerificationCode {
    if (!Number.isInteger(length) || length < 1) {
      throw new InvalidArgument({customMessage: `A verification code length must be a positive integer, received ${length}`});
    }

    let digits = '';

    for (let digitIndex = 0; digitIndex < length; digitIndex += 1) {
      digits += String(randomInt(0, 10));
    }

    return new VerificationCode(digits);
  }

  private constructor (value: string) {
    super(value);

    this.ensureIsValidVerificationCode();
  }

  private ensureIsValidVerificationCode (): void {
    if (!VerificationCode.digitsOnlyRegExp.test(this.value)) {
      throw new InvalidArgument({value: this.value, valueObjectName: this.constructor.name});
    }
  }
}
