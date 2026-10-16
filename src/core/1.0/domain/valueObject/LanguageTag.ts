import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export class LanguageTag extends TrimmedString {
  public static fromPrimitives (primitives: string): LanguageTag {
    return new LanguageTag(primitives);
  }

  private constructor (value: string) {
    super(value);

    this.ensureIsValidLanguageTag();
  }

  private ensureIsValidLanguageTag (): void {
    try {
      new Intl.Locale(this.value);
    } catch {
      throw new InvalidArgument({value: this.value, valueObjectName: this.constructor.name});
    }
  }
}
