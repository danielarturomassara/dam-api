export type Primitives = boolean | Date | number | string;

export abstract class ValueObject<T extends Primitives> {
  protected readonly value: T;

  public constructor (value: T) {
    this.value = value;
    this.ensureValueIsDefined(value);
  }

  public toPrimitives (): T {
    return this.value;
  }

  private ensureValueIsDefined (value: T): void {
    if (value === null || value === undefined) {
      throw new Error('Value must be defined');
    }
  }
}

