import { InvalidArgument } from '@core/domain/error/InvalidArgument.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export class LanguageTag extends TrimmedString {
  public constructor (value: string) {
    super(value);

    this.ensureIsValidLanguageTag();
  }

  private ensureIsValidLanguageTag (): void {
    try {
      new Intl.Locale(this.value);
    } catch (_error) {
      throw new InvalidArgument(`<${ this.constructor.name }> does not allow the value <${ this.value }>`);
    }
  }
}
