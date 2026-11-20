import {RefreshAccessToken} from '@account/application/useCase/RefreshAccessToken.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshAccessToken = dependencyContainer.get<RefreshAccessToken>(RefreshAccessToken);
    const refreshAccessTokenOutput = await refreshAccessToken.run(request.body);

    response.setHeader('Cache-Control', 'no-store');
    response.status(HTTP_SUCCESS_CODES.OK).json(refreshAccessTokenOutput);
  } catch (error) {
    next(error);
  }
};
