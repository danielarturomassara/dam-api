import { ValueObject } from '@core/domain/valueObject/ValueObject.js';

export class Time extends ValueObject<string> {
  public constructor (time: string) {
    super(time);
    this.ensureTimeIsCorrect();
  }

  private ensureTimeIsCorrect (): void {
    const validTime = new RegExp(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.\d{3})?)?$/);

    if (!validTime.test(this.toPrimitives())) {
      throw new Error(`<${ this.constructor.name }> does not allow the value <${ this.value }>`);
    }
  }
}
