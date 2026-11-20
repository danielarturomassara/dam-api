import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

export interface ProviderEnvelope {
  providerName: string;
  rawProviderData: unknown;
}

const isBlank = (value: unknown): boolean => {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
};

export const parseProviderEnvelope = (input: unknown): ProviderEnvelope => {
  const providerValue: unknown = typeof input === 'object' && input !== null ? Reflect.get(input, 'provider') : undefined;

  if (isBlank(providerValue)) {
    throw new InvalidArgument({customMessage: 'provider is required'});
  }

  if (typeof providerValue !== 'string') {
    throw new InvalidArgument({customMessage: `Unknown provider: ${String(providerValue)}`});
  }

  return {providerName: providerValue, rawProviderData: Reflect.get(Object(input), 'providerData')};
};
