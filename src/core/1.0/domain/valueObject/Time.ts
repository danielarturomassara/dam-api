import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export class Time extends TrimmedString {
  private static readonly timeRegExp = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.\d{3})?)?$/;

  public static fromPrimitives (primitives: string): Time {
    return new Time(primitives);
  }

  private constructor (value: string) {
    super(value);

    this.ensureTimeIsCorrect();
  }

  private ensureTimeIsCorrect (): void {
    if (!Time.timeRegExp.test(this.value)) {
      throw new InvalidArgument({value: this.value, valueObjectName: 'Time'});
    }
  }
}
