import { InvalidArgument } from '@core/domain/error/InvalidArgument.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export class Email extends TrimmedString {
  public constructor (value: string) {
    super(value);

    this.ensureIsValidEmail();
  }

  private ensureIsValidEmail (): void {
    const validRegExp = new RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

    if (!validRegExp.test(this.value)) {
      throw new InvalidArgument(`<${ this.constructor.name }> does not allow the value <${ this.value }>`);
    }
  }
}
