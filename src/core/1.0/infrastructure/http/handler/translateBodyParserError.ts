import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {PayloadTooLarge} from '@core/domain/error/PayloadTooLarge.js';
import {ErrorRequestHandler, NextFunction, Request, Response} from 'express';

const BODY_PARSER_ERROR_BY_TYPE = {
  'entity.parse.failed': (): Error => new InvalidArgument({customMessage: 'Malformed JSON body'}),
  'entity.too.large': (): Error => new PayloadTooLarge()
} satisfies Record<string, () => Error>;

export const translateBodyParserError: ErrorRequestHandler = (error: unknown, _request: Request, _response: Response, next: NextFunction): void => {
  const errorType: unknown = typeof error === 'object' && error !== null ? Reflect.get(error, 'type') : undefined;

  if (typeof errorType === 'string' && Object.hasOwn(BODY_PARSER_ERROR_BY_TYPE, errorType)) {
    next(BODY_PARSER_ERROR_BY_TYPE[errorType as keyof typeof BODY_PARSER_ERROR_BY_TYPE]());

    return;
  }

  next(error);
};
