import {LogoutEverywhere} from '@account/application/useCase/LogoutEverywhere.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {getAuthentication} from '@core/infrastructure/http/getAuthentication.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

export default async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const logoutEverywhere = dependencyContainer.get<LogoutEverywhere>(LogoutEverywhere);

    await logoutEverywhere.run(getAuthentication(response));

    response.status(HTTP_SUCCESS_CODES.NO_CONTENT).end();
  } catch (error) {
    next(error);
  }
};
