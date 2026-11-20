import {Forbidden} from '@core/domain/error/Forbidden.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {errorHandler} from '@core/infrastructure/http/handler/errorHandler.js';
import {NextFunction, Request, Response} from 'express';
import {describe, expect, it} from 'vitest';

import {LoggerSpy} from '../../../double/LoggerSpy.js';
import {ResponseRecorder} from '../../../double/ResponseRecorder.js';

const handle = (error: Error): ResponseRecorder => {
  const response = new ResponseRecorder();
  const forbiddenNext: NextFunction = (): void => {
    throw new Error('The error middleware must answer every error itself, never call next.');
  };

  errorHandler(new LoggerSpy())(error, {} as Request, response as unknown as Response, forbiddenNext);

  return response;
};

describe('errorHandler challenge', (): void => {
  it('answers a 401 with the WWW-Authenticate: Bearer header and its message', (): void => {
    const response = handle(new Unauthorized('Invalid credentials'));

    expect(response.statusCode).toBe(401);
    expect(response.headers).toStrictEqual({'WWW-Authenticate': 'Bearer'});
    expect(response.jsonBody).toBe('Unauthorized. Reason: Invalid credentials.');
  });

  it.each([
    ['a 400', new InvalidArgument({customMessage: 'provider is required'})],
    ['a 403', new Forbidden()],
    ['a 501', new NotImplemented()],
    ['a 500', new Error('boom')]
  ])('sends no challenge with %s', (_caseName: string, error: Error): void => {
    expect(handle(error).headers).toStrictEqual({});
  });
});
