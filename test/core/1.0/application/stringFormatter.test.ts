import {formatE164, formatEmail, formatFullname, formatInitials} from '@core/application/stringFormatter.js';
import {Names} from '@core/domain/valueObject/Names.js';
import {describe, expect, it} from 'vitest';

const names = Names.fromPrimitives({family: 'de la Vega', given: 'Ana María'});

describe('formatFullname', (): void => {
  it('puts the given name first by default', (): void => {
    expect(formatFullname(names)).toBe('Ana María de la Vega');
  });

  it('puts the upper-cased family name first when asked', (): void => {
    expect(formatFullname(names, true)).toBe('DE LA VEGA, Ana María');
  });
});

describe('formatInitials', (): void => {
  it('takes the upper-cased first character of every part of both names', (): void => {
    expect(formatInitials(names)).toBe('A' + 'M' + 'D' + 'L' + 'V');
  });

  it('follows every initial with the separator and trims the result', (): void => {
    expect(formatInitials(names, '.')).toBe('A.M.D.L.V.');
    expect(formatInitials(names, ' ')).toBe('A M D L V');
  });
});

describe('formatEmail', (): void => {
  it('lower-cases the whole address', (): void => {
    expect(formatEmail('Someone@Example.COM')).toBe('someone@example.com');
  });
});

describe('formatE164', (): void => {
  it.each([
    ['+34 600 123 456', '+34600123456'],
    ['0034 (600) 123-456', '+34600123456'],
    ['34.600.123.456', '+34600123456'],
    ['+1 (555) 010-0000', '+15550100000']
  ])('normalizes %s to %s', (input: string, expected: string): void => {
    expect(formatE164(input)).toBe(expected);
  });

  it('never removes letters', (): void => {
    expect(formatE164('+34abc')).toBe('+34abc');
  });
});
