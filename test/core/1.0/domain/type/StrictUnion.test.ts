import {StrictUnion} from '@core/domain/type/StrictUnion.js';
import {describe, expect, expectTypeOf, it} from 'vitest';

// TYPE tests: the assertions are validated by `npm run type-check`; each ts-expect-error line
// fails the type-check if the rejection it pins ever stops happening.

interface CircleShape {
  kind: 'circle';
  radius: number;
}

type Shape = StrictUnion<CircleShape | SquareShape>;

interface SquareShape {
  kind: 'square';
  side: number;
}

describe('StrictUnion', (): void => {
  it('accepts every plain member of the union', (): void => {
    const circle: Shape = {kind: 'circle', radius: 2};
    const square: Shape = {kind: 'square', side: 3};

    expect(circle.kind).toBe('circle');
    expect(square.kind).toBe('square');
  });

  it('rejects a member carrying another member\'s field', (): void => {
    // @ts-expect-error a circle cannot carry a square's side
    const invalidShape: Shape = {kind: 'circle', radius: 2, side: 3};

    expect(invalidShape.kind).toBe('circle');
  });

  it('keeps every union key readable on the union type', (): void => {
    const shape: Shape = {kind: 'circle', radius: 2};
    const sideValue: number | undefined = shape.side;

    expect(sideValue).toBeUndefined();
  });

  it('preserves discriminant narrowing', (): void => {
    const shape: Shape = {kind: 'square', side: 3};

    if (shape.kind === 'square') {
      expectTypeOf(shape.side).toEqualTypeOf<number>();
      expect(shape.side).toBe(3);
    }
  });
});
