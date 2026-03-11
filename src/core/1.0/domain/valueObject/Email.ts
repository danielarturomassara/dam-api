import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export class Email extends TrimmedString {
  private static readonly emailRegExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  public static fromPrimitives (primitives: string): Email {
    return new Email(primitives);
  }

  private constructor (value: string) {
    super(value);

    this.ensureIsValidEmail();
  }

  private ensureIsValidEmail (): void {
    if (!Email.emailRegExp.test(this.value)) {
      throw new InvalidArgument({value: this.value, valueObjectName: 'Email'});
    }
  }
}
