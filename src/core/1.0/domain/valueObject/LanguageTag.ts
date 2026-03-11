import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export class LanguageTag extends TrimmedString {
  public static fromPrimitives (primitives: string): LanguageTag {
    return new LanguageTag(primitives);
  }

  protected constructor (value: string) {
    super(value);

    this.ensureIsValidLanguageTag();
  }

  private ensureIsValidLanguageTag (): void {
    try {
      new Intl.Locale(this.value);
    } catch (_error) {
      throw new InvalidArgument({value: this.value, valueObjectName: 'LanguageTag'});
    }
  }
}
