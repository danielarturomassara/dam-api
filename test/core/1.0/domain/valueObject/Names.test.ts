import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Names} from '@core/domain/valueObject/Names.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

const nonBlankArbitrary = fc.string({minLength: 1}).filter((value) => value.trim().length > 0);

describe('Names', (): void => {
  it('round-trips trimmed given and family names', (): void => {
    fc.assert(fc.property(nonBlankArbitrary, nonBlankArbitrary, (given: string, family: string): void => {
      expect(Names.fromPrimitives({family, given}).toPrimitives()).toStrictEqual({family: family.trim(), given: given.trim()});
    }));
  });

  it.each([
    {family: 'Doe', given: ''},
    {family: '', given: 'Jane'},
    {family: '   ', given: 'Jane'}
  ])('rejects an empty name %j', (primitives: {family: string; given: string}): void => {
    expect((): unknown => Names.fromPrimitives(primitives)).toThrow(new InvalidArgument({customMessage: '<Names> does not allow empty strings'}));
  });
});
