import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {ValueObject} from '@core/domain/valueObject/ValueObject.js';
import {describe, expect, it} from 'vitest';

class Quantity extends ValueObject<number> {
  public static fromPrimitives (primitives: number): Quantity {
    return new Quantity(primitives);
  }

  public isSameAs (other: Quantity): boolean {
    return this.equals(other);
  }

  private constructor (value: number) {
    super(value);
  }
}

describe('ValueObject', (): void => {
  it('exposes its primitive through toPrimitives', (): void => {
    expect(Quantity.fromPrimitives(3).toPrimitives()).toBe(3);
  });

  it('compares by value', (): void => {
    expect(Quantity.fromPrimitives(3).isSameAs(Quantity.fromPrimitives(3))).toBe(true);
    expect(Quantity.fromPrimitives(3).isSameAs(Quantity.fromPrimitives(4))).toBe(false);
  });

  it.each([null, undefined])('rejects %s naming the value object', (value: null | undefined): void => {
    expect((): unknown => Quantity.fromPrimitives(value as unknown as number))
      .toThrow(new InvalidArgument({value, valueObjectName: 'Quantity'}));
  });
});
