import {Login} from '@account/application/useCase/Login.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const login = dependencyContainer.get<Login>(Login);
    const loginOutput = await login.run(request.body);

    response.setHeader('Cache-Control', 'no-store');
    response.status(HTTP_SUCCESS_CODES.OK).json(loginOutput);
  } catch (error) {
    next(error);
  }
};
