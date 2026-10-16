import {VerificationCode} from '@account/domain/valueObject/VerificationCode.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

describe('VerificationCode', (): void => {
  it('accepts every digits-only string', (): void => {
    fc.assert(fc.property(fc.stringMatching(/^\d+$/), (code: string): void => {
      expect(VerificationCode.fromPrimitives(code).toPrimitives()).toBe(code);
    }));
  });

  it('generates codes of the requested length made of digits only', (): void => {
    fc.assert(fc.property(fc.integer({max: 12, min: 1}), (length: number): void => {
      expect(VerificationCode.generate(length).toPrimitives()).toMatch(new RegExp(`^\\d{${length}}$`));
    }));
  });

  it('spreads its generated values', (): void => {
    const codeSet = new Set(Array.from({length: 50}, () => VerificationCode.generate(6).toPrimitives()));

    expect(codeSet.size).toBeGreaterThan(40);
  });

  it('trims surrounding whitespace like every string value object', (): void => {
    expect(VerificationCode.fromPrimitives(' 123 ').toPrimitives()).toBe('123');
  });

  it.each(['', '12a4', '12.3', '1 2'])('rejects %j', (value: string): void => {
    expect((): unknown => VerificationCode.fromPrimitives(value)).toThrow(InvalidArgument);
  });

  it.each([0, -1, 1.5])('refuses to generate with the length %s', (length: number): void => {
    expect((): unknown => VerificationCode.generate(length)).toThrow(InvalidArgument);
  });
});
