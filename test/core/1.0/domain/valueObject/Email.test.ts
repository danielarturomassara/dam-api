import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Email} from '@core/domain/valueObject/Email.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

describe('Email', (): void => {
  it('accepts every well-formed address', (): void => {
    fc.assert(fc.property(fc.emailAddress(), (address: string): void => {
      expect(Email.fromPrimitives(address).toPrimitives()).toBe(address);
    }));
  });

  it('trims surrounding whitespace', (): void => {
    expect(Email.fromPrimitives('  someone@example.com  ').toPrimitives()).toBe('someone@example.com');
  });

  it.each(['', 'someone', 'someone@', '@example.com', 'someone@example', 'some one@example.com'])('rejects %j', (value: string): void => {
    expect((): unknown => Email.fromPrimitives(value)).toThrow(new InvalidArgument({value: value.trim(), valueObjectName: 'Email'}));
  });
});
