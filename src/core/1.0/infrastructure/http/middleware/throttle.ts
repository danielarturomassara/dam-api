import {normalizeClientAddress} from '@core/application/normalizeClientAddress.js';
import {TooManyRequests} from '@core/domain/error/TooManyRequests.js';
import {RequestThrottle} from '@core/domain/RequestThrottle.js';
import {ThrottleScope} from '@core/domain/type/ThrottleScope.js';
import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';
import {NextFunction, Request, RequestHandler, Response} from 'express';

export const throttle = (requestThrottle: RequestThrottle, scope: ThrottleScope, throttlePolicy: ThrottlePolicy): RequestHandler => {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const throttleDecision = await requestThrottle.consume(scope, normalizeClientAddress(request.ip), throttlePolicy);

      if (!throttleDecision.isAllowed) {
        response.setHeader('Retry-After', String(throttleDecision.retryAfterSeconds));

        next(new TooManyRequests());

        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
