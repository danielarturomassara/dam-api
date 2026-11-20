import {VerifyIdentity} from '@account/application/useCase/VerifyIdentity.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const verifyIdentity = dependencyContainer.get<VerifyIdentity>(VerifyIdentity);

    await verifyIdentity.run(request.body);

    response.status(HTTP_SUCCESS_CODES.NO_CONTENT).end();
  } catch (error) {
    next(error);
  }
};
