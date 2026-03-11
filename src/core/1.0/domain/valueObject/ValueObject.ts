import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

export type Primitives = boolean | Date | number | string;

export abstract class ValueObject<T extends Primitives> {
  protected readonly value: T;

  public toPrimitives (): T {
    return this.value;
  }

  protected constructor (value: T) {
    this.value = value;
    this.ensureValueIsDefined();
  }

  protected equals (other: ValueObject<T>): boolean {
    return this.value === other.value;
  }

  private ensureValueIsDefined (): void {
    if (this.value === null || this.value === undefined) {
      throw new InvalidArgument({value: this.value, valueObjectName: this.constructor.name});
    }
  }
}

