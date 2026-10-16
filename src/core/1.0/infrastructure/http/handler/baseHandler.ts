import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {Handler, NextFunction, Request, Response} from 'express';

export const baseHandler = (appName: string, moduleName: string): Handler => {
  return (_request: Request, response: Response, next: NextFunction): void => {
    try {
      response.status(HTTP_SUCCESS_CODES.OK).json(`${appName} - ${moduleName} home page`);
    } catch (error) {
      next(error);
    }
  };
};
