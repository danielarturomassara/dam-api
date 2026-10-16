import {Register} from '@account/application/useCase/Register.js';
import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {Logger, LOGGER} from '@core/domain/Logger.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  const logger = dependencyContainer.get<Logger>(LOGGER);

  try {
    const register = dependencyContainer.get<Register>(Register);

    await register.run(request.body);

    response.status(HTTP_SUCCESS_CODES.ACCEPTED).end();
  } catch (error) {
    // TODO(spec §3.3/§4.5, issue #2): when the oauth flows land, a DuplicateContact thrown by a
    // provider that creates VERIFIED identities must answer 409 — this silence needs provider
    // awareness before any oauth strategy can throw DuplicateContact.
    if (error instanceof DuplicateContact) {
      logger.warning(`Silenced a duplicate registration attempt (${error.message})`);
      response.status(HTTP_SUCCESS_CODES.ACCEPTED).end();

      return;
    }

    next(error);
  }
};
