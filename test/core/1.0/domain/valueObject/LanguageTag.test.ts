import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {LanguageTag} from '@core/domain/valueObject/LanguageTag.js';
import {describe, expect, it} from 'vitest';

describe('LanguageTag', (): void => {
  it.each(['en', 'es-AR', 'pt-BR', 'zh-Hant-TW'])('accepts %s', (value: string): void => {
    expect(LanguageTag.fromPrimitives(value).toPrimitives()).toBe(value);
  });

  it.each(['', 'english!', '123', 'a-'])('rejects %j', (value: string): void => {
    expect((): unknown => LanguageTag.fromPrimitives(value)).toThrow(new InvalidArgument({value, valueObjectName: 'LanguageTag'}));
  });
});
