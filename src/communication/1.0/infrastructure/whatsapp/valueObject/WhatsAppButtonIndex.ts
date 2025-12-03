import { InvalidArgument } from '@core/domain/error/InvalidArgument.js';
import { ValueObject } from '@core/domain/valueObject/ValueObject.js';

export class WhatsAppButtonIndex extends ValueObject<number> {
  public constructor (value: number) {
    super(value);

    this.ensureIsValidIndex();
  }

  public ensureIsValidIndex (): void {
    if (!Number.isInteger(this.value) || this.value < 0 || this.value > 9) {
      throw new InvalidArgument(`<${ this.constructor.name }> does not allow the value <${ this.value }>.`);
    }
  }
}
