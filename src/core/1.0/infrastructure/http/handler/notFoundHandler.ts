import {NotFound} from '@core/domain/error/NotFound.js';
import {NextFunction, Request, RequestHandler, Response} from 'express';

export const notFoundHandler: RequestHandler = (request: Request, _response: Response, next: NextFunction): void => {
  next(new NotFound(`Route ${request.method} ${request.path}`));
};
