import {BadGateway} from '@core/domain/error/BadGateway.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {DatabaseError} from '@core/domain/error/DatabaseError.js';
import {ExpectationFailed} from '@core/domain/error/ExpectationFailed.js';
import {FailedDependency} from '@core/domain/error/FailedDependency.js';
import {Forbidden} from '@core/domain/error/Forbidden.js';
import {GatewayTimeout} from '@core/domain/error/GatewayTimeout.js';
import {Gone} from '@core/domain/error/Gone.js';
import {HttpVersionNotSupported} from '@core/domain/error/HttpVersionNotSupported.js';
import {ImATeapot} from '@core/domain/error/ImATeapot.js';
import {InsufficientStorage} from '@core/domain/error/InsufficientStorage.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {LengthRequired} from '@core/domain/error/LengthRequired.js';
import {Locked} from '@core/domain/error/Locked.js';
import {LoopDetected} from '@core/domain/error/LoopDetected.js';
import {MethodNotAllowed} from '@core/domain/error/MethodNotAllowed.js';
import {MisdirectedRequest} from '@core/domain/error/MisdirectedRequest.js';
import {NetworkAuthenticationRequired} from '@core/domain/error/NetworkAuthenticationRequired.js';
import {NotAcceptable} from '@core/domain/error/NotAcceptable.js';
import {NotExtended} from '@core/domain/error/NotExtended.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {PayloadTooLarge} from '@core/domain/error/PayloadTooLarge.js';
import {PaymentRequired} from '@core/domain/error/PaymentRequired.js';
import {PreconditionFailed} from '@core/domain/error/PreconditionFailed.js';
import {PreconditionRequired} from '@core/domain/error/PreconditionRequired.js';
import {ProxyAuthenticationRequired} from '@core/domain/error/ProxyAuthenticationRequired.js';
import {RangeNotSatisfiable} from '@core/domain/error/RangeNotSatisfiable.js';
import {RequestHeaderFieldsTooLarge} from '@core/domain/error/RequestHeaderFieldsTooLarge.js';
import {RequestTimeout} from '@core/domain/error/RequestTimeout.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {ServiceUnavailable} from '@core/domain/error/ServiceUnavailable.js';
import {TooEarly} from '@core/domain/error/TooEarly.js';
import {TooManyRequests} from '@core/domain/error/TooManyRequests.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {UnavailableForLegalReasons} from '@core/domain/error/UnavailableForLegalReasons.js';
import {UnprocessableEntity} from '@core/domain/error/UnprocessableEntity.js';
import {UnsupportedMediaType} from '@core/domain/error/UnsupportedMediaType.js';
import {UpgradeRequired} from '@core/domain/error/UpgradeRequired.js';
import {UriTooLong} from '@core/domain/error/UriTooLong.js';
import {VariantAlsoNegotiates} from '@core/domain/error/VariantAlsoNegotiates.js';
import {errorHandler} from '@core/infrastructure/http/handler/errorHandler.js';
import {NextFunction, Request, Response} from 'express';
import {describe, expect, it} from 'vitest';

import {LoggerSpy} from '../../../double/LoggerSpy.js';
import {ResponseRecorder} from '../../../double/ResponseRecorder.js';

// Pins spec/approved/core.spec.md §5: the full domain-error → HTTP map.

class DuplicateThing extends Conflict {}

const handle = (error: Error): {logger: LoggerSpy; response: ResponseRecorder} => {
  const logger = new LoggerSpy();
  const response = new ResponseRecorder();
  const forbiddenNext: NextFunction = (): void => {
    throw new Error('The error middleware must answer every error itself, never call next.');
  };

  errorHandler(logger)(error, {} as Request, response as unknown as Response, forbiddenNext);

  return {logger, response};
};

const clientErrorList: Array<[string, Error, number, string]> = [
  ['InvalidArgument', new InvalidArgument({customMessage: 'provider is required'}), 400, 'provider is required'],
  ['Unauthorized', new Unauthorized('expired token'), 401, 'Unauthorized. Reason: expired token.'],
  ['PaymentRequired', new PaymentRequired(), 402, 'Payment required.'],
  ['Forbidden', new Forbidden(), 403, 'You don\'t have permissions to access this resource.'],
  ['NotFound', new NotFound('Account'), 404, 'Account not found.'],
  ['MethodNotAllowed', new MethodNotAllowed(), 405, 'Method not allowed.'],
  ['NotAcceptable', new NotAcceptable(), 406, 'Not acceptable.'],
  ['ProxyAuthenticationRequired', new ProxyAuthenticationRequired(), 407, 'Proxy authentication required.'],
  ['RequestTimeout', new RequestTimeout(), 408, 'Request timeout.'],
  ['Conflict', new Conflict('email'), 409, 'Conflict: email.'],
  ['Conflict subclass', new DuplicateThing('phone'), 409, 'Conflict: phone.'],
  ['Gone', new Gone(), 410, 'Gone.'],
  ['LengthRequired', new LengthRequired(), 411, 'Length required.'],
  ['PreconditionFailed', new PreconditionFailed(), 412, 'Precondition failed.'],
  ['PayloadTooLarge', new PayloadTooLarge(), 413, 'Payload too large.'],
  ['UriTooLong', new UriTooLong(), 414, 'URI too long.'],
  ['UnsupportedMediaType', new UnsupportedMediaType(), 415, 'Unsupported media type.'],
  ['RangeNotSatisfiable', new RangeNotSatisfiable(), 416, 'Range not satisfiable.'],
  ['ExpectationFailed', new ExpectationFailed(), 417, 'Expectation failed.'],
  ['ImATeapot', new ImATeapot(), 418, 'I\'m a teapot.'],
  ['MisdirectedRequest', new MisdirectedRequest(), 421, 'Misdirected request.'],
  ['UnprocessableEntity', new UnprocessableEntity(), 422, 'Unprocessable entity.'],
  ['Locked', new Locked(), 423, 'Locked.'],
  ['FailedDependency', new FailedDependency(), 424, 'Failed dependency.'],
  ['TooEarly', new TooEarly(), 425, 'Too early.'],
  ['UpgradeRequired', new UpgradeRequired(), 426, 'Upgrade required.'],
  ['PreconditionRequired', new PreconditionRequired(), 428, 'Precondition required.'],
  ['TooManyRequests', new TooManyRequests(), 429, 'Too many requests.'],
  ['RequestHeaderFieldsTooLarge', new RequestHeaderFieldsTooLarge(), 431, 'Request header fields too large.'],
  ['UnavailableForLegalReasons', new UnavailableForLegalReasons(), 451, 'Unavailable for legal reasons.']
];

const serverErrorList: Array<[string, Error, number]> = [
  ['NotImplemented', new NotImplemented('soon'), 501],
  ['BadGateway', new BadGateway('the provider timed out'), 502],
  ['ServiceUnavailable', new ServiceUnavailable(), 503],
  ['GatewayTimeout', new GatewayTimeout(), 504],
  ['HttpVersionNotSupported', new HttpVersionNotSupported(), 505],
  ['VariantAlsoNegotiates', new VariantAlsoNegotiates(), 506],
  ['InsufficientStorage', new InsufficientStorage(), 507],
  ['LoopDetected', new LoopDetected(), 508],
  ['NotExtended', new NotExtended(), 510],
  ['NetworkAuthenticationRequired', new NetworkAuthenticationRequired(), 511]
];

const unmappedErrorList: Array<[string, Error]> = [
  ['ServerError', new ServerError('the database credentials are wrong')],
  ['DatabaseError', new DatabaseError()],
  ['Error', new Error('boom')]
];

describe('errorHandler', (): void => {
  it.each(clientErrorList)('answers %s with its status and message body', (_errorName: string, error: Error, expectedStatus: number, expectedBody: string): void => {
    const {response} = handle(error);

    expect(response.statusCode).toBe(expectedStatus);
    expect(response.jsonBody).toBe(expectedBody);
  });

  it.each(serverErrorList)('answers %s with its status and an empty body', (_errorName: string, error: Error, expectedStatus: number): void => {
    const {response} = handle(error);

    expect(response.statusCode).toBe(expectedStatus);
    expect(response.isEnded).toBe(true);
    expect(response.jsonBody).toBeUndefined();
  });

  it.each(unmappedErrorList)('answers %s with 500 and "Unknown error"', (_errorName: string, error: Error): void => {
    const {response} = handle(error);

    expect(response.statusCode).toBe(500);
    expect(response.jsonBody).toBe('Unknown error');
  });

  it('logs every error before answering', (): void => {
    const error = new ServerError('database unreachable');

    const {logger} = handle(error);

    expect(logger.errorList).toStrictEqual([error]);
  });

  it('keeps the Express error-middleware arity of four', (): void => {
    expect(errorHandler(new LoggerSpy()).length).toBe(4);
  });
});
