import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

const e164Arbitrary = fc.stringMatching(/^\+\d{7,15}$/);

describe('Phone', (): void => {
  it('accepts every E.164 number', (): void => {
    fc.assert(fc.property(e164Arbitrary, (phone: string): void => {
      expect(Phone.fromPrimitives(phone).toPrimitives()).toBe(phone);
    }));
  });

  it.each(['', '600123456', '+34 600 123 456', '+123456', '+1234567890123456', '0034600123456'])('rejects %j', (value: string): void => {
    expect((): unknown => Phone.fromPrimitives(value)).toThrow(new InvalidArgument({value, valueObjectName: 'Phone'}));
  });
});
