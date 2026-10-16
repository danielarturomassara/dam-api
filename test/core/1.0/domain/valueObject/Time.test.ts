import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Time} from '@core/domain/valueObject/Time.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

const timeArbitrary = fc.tuple(fc.integer({max: 23, min: 0}), fc.integer({max: 59, min: 0}), fc.integer({max: 59, min: 0}))
  .map(([hours, minutes, seconds]) => `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

describe('Time', (): void => {
  it('accepts every hours:minutes:seconds value', (): void => {
    fc.assert(fc.property(timeArbitrary, (time: string): void => {
      expect(Time.fromPrimitives(time).toPrimitives()).toBe(time);
    }));
  });

  it.each(['09:30', '9:30', '23:59:59', '23:59:59.123'])('accepts %s', (value: string): void => {
    expect(Time.fromPrimitives(value).toPrimitives()).toBe(value);
  });

  it.each(['', '24:00', '12:60', '12:30:60', '12:30:15.1', 'noon'])('rejects %j', (value: string): void => {
    expect((): unknown => Time.fromPrimitives(value)).toThrow(new InvalidArgument({value, valueObjectName: 'Time'}));
  });
});
