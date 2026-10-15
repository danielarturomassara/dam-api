import {baseHandler} from '@core/infrastructure/http/handler/baseHandler.js';
import {NextFunction, Request, Response} from 'express';
import {describe, expect, it} from 'vitest';

import {ResponseRecorder} from '../../../double/ResponseRecorder.js';

describe('baseHandler', (): void => {
  it('answers 200 with the module home page string', (): void => {
    const response = new ResponseRecorder();
    const forbiddenNext: NextFunction = (): void => {
      throw new Error('the home page never fails');
    };

    baseHandler('api-test', 'account')({} as Request, response as unknown as Response, forbiddenNext);

    expect(response.statusCode).toBe(200);
    expect(response.jsonBody).toBe('api-test - account home page');
  });

  it('forwards a failure to next', (): void => {
    const failingResponse = {
      status: (): never => {
        throw new Error('boom');
      }
    };
    let forwardedError: unknown = null;

    baseHandler('api-test', 'account')({} as Request, failingResponse as unknown as Response, (error: unknown): void => {
      forwardedError = error;
    });

    expect(forwardedError).toBeInstanceOf(Error);
  });
});
