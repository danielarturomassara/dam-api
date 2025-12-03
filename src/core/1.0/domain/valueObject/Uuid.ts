import { ValueObject } from '@core/domain/valueObject/ValueObject.js';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export class Uuid extends ValueObject<string> {
  public static create (): string {
    return uuidv4();
  }

  public constructor (value: string) {
    super(value);
    this.ensureIsValidUuid(value);
  }

  private ensureIsValidUuid (uuid: string): void {
    if (!uuidValidate(uuid)) {
      throw new Error(`<${ this.constructor.name }> does not allow the value <${ uuid }>`);
    }
  }
}
