import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

describe('Uuid', (): void => {
  it('accepts every uuid', (): void => {
    fc.assert(fc.property(fc.uuid(), (value: string): void => {
      expect(Uuid.fromPrimitives(value).toPrimitives()).toBe(value);
    }));
  });

  it('creates distinct valid v4 identifiers', (): void => {
    const first = Uuid.create().toPrimitives();
    const second = Uuid.create().toPrimitives();

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first).not.toBe(second);
  });

  it.each(['', 'not-a-uuid', '3f2504e0-4f89-41d3-9a0c'])('rejects %j', (value: string): void => {
    expect((): unknown => Uuid.fromPrimitives(value)).toThrow(new InvalidArgument({value, valueObjectName: 'Uuid'}));
  });
});
