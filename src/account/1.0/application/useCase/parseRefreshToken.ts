import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

export const parseRefreshToken = (input: unknown): string => {
  const refreshToken: unknown = typeof input === 'object' && input !== null ? Reflect.get(input, 'refreshToken') : undefined;

  if (refreshToken === undefined || refreshToken === null || refreshToken === '') {
    throw new InvalidArgument({customMessage: 'refreshToken is required'});
  }

  if (typeof refreshToken !== 'string') {
    throw new InvalidArgument({customMessage: 'refreshToken must be a string'});
  }

  return refreshToken;
};
