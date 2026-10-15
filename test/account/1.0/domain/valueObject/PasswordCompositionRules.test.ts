import {PasswordCompositionRules} from '@account/domain/valueObject/PasswordCompositionRules.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {describe, expect, it} from 'vitest';

const buildRules = (overrides: Partial<{minimumDigitCount: number; minimumLowercaseCount: number; minimumSymbolCount: number; minimumUppercaseCount: number}> = {}): PasswordCompositionRules => {
  return PasswordCompositionRules.fromPrimitives({
    minimumDigitCount: 0,
    minimumLowercaseCount: 0,
    minimumSymbolCount: 0,
    minimumUppercaseCount: 0,
    ...overrides
  });
};

describe('PasswordCompositionRules', (): void => {
  it('round-trips its counts', (): void => {
    const primitives = {minimumDigitCount: 1, minimumLowercaseCount: 2, minimumSymbolCount: 3, minimumUppercaseCount: 4};

    expect(PasswordCompositionRules.fromPrimitives(primitives).toPrimitives()).toStrictEqual(primitives);
  });

  it('accepts any password when every count is zero', (): void => {
    expect((): void => buildRules().ensureSatisfiedBy('')).not.toThrow();
  });

  it.each([
    [{minimumDigitCount: 2}, 'abc1', 'Password must contain at least 2 digits'],
    [{minimumLowercaseCount: 1}, 'ABC1', 'Password must contain at least 1 lowercase letters'],
    [{minimumUppercaseCount: 1}, 'abc1', 'Password must contain at least 1 uppercase letters'],
    [{minimumSymbolCount: 1}, 'abc1', 'Password must contain at least 1 symbols']
  ])('enforces %o against %s', (overrides: Record<string, number>, password: string, expectedMessage: string): void => {
    expect((): void => buildRules(overrides).ensureSatisfiedBy(password)).toThrow(new InvalidArgument({customMessage: expectedMessage}));
  });

  it('counts unicode letters and symbols', (): void => {
    const rules = buildRules({minimumDigitCount: 1, minimumLowercaseCount: 1, minimumSymbolCount: 1, minimumUppercaseCount: 1});

    expect((): void => rules.ensureSatisfiedBy('Ñandú-2026')).not.toThrow();
  });

  it.each([-1, 1.5])('rejects the count %s', (count: number): void => {
    expect((): unknown => buildRules({minimumDigitCount: count}))
      .toThrow(new InvalidArgument({customMessage: 'minimumDigitCount must be a non-negative integer'}));
  });
});
