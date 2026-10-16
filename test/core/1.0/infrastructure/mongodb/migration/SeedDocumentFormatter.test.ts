import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {SeedDocumentFormatter} from '@core/infrastructure/mongodb/migration/SeedDocumentFormatter.js';
import {describe, expect, it} from 'vitest';

describe('SeedDocumentFormatter', (): void => {
  it('normalizes empty values to null and passes primitives through', (): void => {
    expect(SeedDocumentFormatter.format({age: 3, missing: undefined, name: 'x', nothing: null}))
      .toStrictEqual({age: 3, missing: null, name: 'x', nothing: null});
  });

  it('decodes $date strings and numbers', (): void => {
    const formatted = SeedDocumentFormatter.format({at: {$date: '2026-01-05T10:00:00.000Z'}, since: {$date: 0}});

    expect(formatted.at).toStrictEqual(new Date('2026-01-05T10:00:00.000Z'));
    expect(formatted.since).toStrictEqual(new Date(0));
  });

  it('decodes $numberLong only for the timestamp fields, recursing elsewhere', (): void => {
    const formatted = SeedDocumentFormatter.format({
      created_at: {$numberLong: '1735000000000'},
      nested: {updated_at: {$numberLong: '1735000000000'}, weight: {$numberLong: '5'}}
    });

    expect(formatted.created_at).toStrictEqual(new Date(1735000000000));
    expect(formatted.nested).toStrictEqual({updated_at: new Date(1735000000000), weight: {$numberLong: '5'}});
  });

  it('keeps arrays as arrays, decoding their elements', (): void => {
    const formatted = SeedDocumentFormatter.format({tags: ['a', 'b'], visits: [{at: {$date: 0}}, null]});

    expect(formatted.tags).toStrictEqual(['a', 'b']);
    expect(formatted.visits).toStrictEqual([{at: new Date(0)}, null]);
  });

  it('fails loudly on a $numberLong that is not a number', (): void => {
    expect((): unknown => SeedDocumentFormatter.format({created_at: {$numberLong: null}})).toThrow(InvalidArgument);
    expect((): unknown => SeedDocumentFormatter.format({created_at: {$numberLong: ''}})).toThrow(InvalidArgument);
    expect((): unknown => SeedDocumentFormatter.format({created_at: {$numberLong: 'soon'}})).toThrow(InvalidArgument);
  });

  it('fails loudly on an undecodable date', (): void => {
    expect((): unknown => SeedDocumentFormatter.format({at: {$date: 'not a date'}}))
      .toThrow(new InvalidArgument({value: 'not a date', valueObjectName: 'SeedDate'}));
    expect((): unknown => SeedDocumentFormatter.format({at: {$date: true}})).toThrow(InvalidArgument);
  });
});
