import {RequestLoginCode} from '@account/application/useCase/RequestLoginCode.js';
import {LoginNotAllowed} from '@account/domain/error/LoginNotAllowed.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {TooManyRequests} from '@core/domain/error/TooManyRequests.js';
import {Logger, LOGGER} from '@core/domain/Logger.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

const SILENCED_ERROR_CLASS_LIST = [LoginNotAllowed, NotFound, TooManyRequests];

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  const logger = dependencyContainer.get<Logger>(LOGGER);

  try {
    const requestLoginCode = dependencyContainer.get<RequestLoginCode>(RequestLoginCode);

    await requestLoginCode.run(request.body);

    response.status(HTTP_SUCCESS_CODES.ACCEPTED).end();
  } catch (error) {
    if (error instanceof Error && SILENCED_ERROR_CLASS_LIST.some((silencedErrorClass) => error instanceof silencedErrorClass)) {
      logger.warning(`Silenced a login code request (${error.message})`);
      response.status(HTTP_SUCCESS_CODES.ACCEPTED).end();

      return;
    }

    next(error);
  }
};
