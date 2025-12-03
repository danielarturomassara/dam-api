import { Handler, NextFunction, Request, Response } from 'express';

export const baseHandler = (appName: string, moduleName: string): Handler => {
  return async (_request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      response.status(200).json(`${ appName } - ${ moduleName } home page`);
    } catch (error) {
      next(error);
    }
  };
};
