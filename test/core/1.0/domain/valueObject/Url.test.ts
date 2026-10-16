import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Url} from '@core/domain/valueObject/Url.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

describe('Url', (): void => {
  it('accepts every parsable URL', (): void => {
    fc.assert(fc.property(fc.webUrl(), (url: string): void => {
      expect(Url.fromPrimitives(url).toPrimitives()).toBe(url);
    }));
  });

  it.each(['', 'not a url', 'example.com', '://missing-scheme'])('rejects %j', (value: string): void => {
    expect((): unknown => Url.fromPrimitives(value)).toThrow(new InvalidArgument({value, valueObjectName: 'Url'}));
  });
});
