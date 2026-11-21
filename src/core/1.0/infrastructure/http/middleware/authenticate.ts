import {AccessTokenAuthenticator} from '@core/domain/AccessTokenAuthenticator.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {NextFunction, Request, RequestHandler, Response} from 'express';

const BEARER_TOKEN_PATTERN = /^Bearer +([A-Za-z0-9\-._~+/]+=*)$/i;

export const authenticate = (accessTokenAuthenticator: AccessTokenAuthenticator): RequestHandler => {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const accessToken = BEARER_TOKEN_PATTERN.exec(request.headers.authorization ?? '')?.[1];

      if (accessToken === undefined) {
        throw new Unauthorized('Missing access token');
      }

      response.locals.authentication = await accessTokenAuthenticator.authenticate(accessToken);

      next();
    } catch (error) {
      next(error);
    }
  };
};
