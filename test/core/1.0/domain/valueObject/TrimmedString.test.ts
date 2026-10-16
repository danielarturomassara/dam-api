import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

describe('TrimmedString', (): void => {
  it.each([null, undefined, 42])('rejects the non-string %s with InvalidArgument naming the concrete value object', (value: unknown): void => {
    expect((): unknown => TrimmedString.fromPrimitives(value as string)).toThrow(new InvalidArgument({value, valueObjectName: 'TrimmedString'}));
    expect((): unknown => Email.fromPrimitives(value as string)).toThrow(new InvalidArgument({value, valueObjectName: 'Email'}));
  });

  it('trims every string it is given', (): void => {
    fc.assert(fc.property(fc.string(), (value: string): void => {
      expect(TrimmedString.fromPrimitives(value).toPrimitives()).toBe(value.trim());
    }));
  });

  it('reports emptiness after trimming', (): void => {
    expect(TrimmedString.fromPrimitives('   ').isEmptyString()).toBe(true);
    expect(TrimmedString.fromPrimitives(' a ').isEmptyString()).toBe(false);
  });
});
