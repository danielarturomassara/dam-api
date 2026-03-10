import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';
import {v4 as uuidv4, validate as uuidValidate} from 'uuid';

export class Uuid extends TrimmedString {
  public static create (): Uuid {
    return new Uuid(uuidv4());
  }

  public static fromPrimitives (primitives: string): Uuid {
    return new Uuid(primitives);
  }

  private constructor (value: string) {
    super(value);

    this.ensureIsValidUuid();
  }

  private ensureIsValidUuid (): void {
    if (!uuidValidate(this.value)) {
      throw new InvalidArgument({value: this.value, valueObjectName: 'Uuid'});
    }
  }
}
