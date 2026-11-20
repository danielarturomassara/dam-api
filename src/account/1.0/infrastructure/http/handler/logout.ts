import {Logout} from '@account/application/useCase/Logout.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {getAuthentication} from '@core/infrastructure/http/getAuthentication.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const logout = dependencyContainer.get<Logout>(Logout);

    await logout.run(getAuthentication(response), request.body);

    response.status(HTTP_SUCCESS_CODES.NO_CONTENT).end();
  } catch (error) {
    next(error);
  }
};
