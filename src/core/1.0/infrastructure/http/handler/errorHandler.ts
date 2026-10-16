import {BadGateway} from '@core/domain/error/BadGateway.js';
import {Conflict} from '@core/domain/error/Conflict.js';
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
import {Logger} from '@core/domain/Logger.js';
import {HTTP_CLIENT_ERROR_CODES, HTTP_SERVER_ERROR_CODES} from '@core/domain/type/HttpCodes.js';
import {ErrorRequestHandler, NextFunction, Request, Response} from 'express';
import {Newable} from 'inversify';

interface ErrorStatusMapping<STATUS_CODE> {
  errorClass: Newable<Error>;
  statusCode: STATUS_CODE;
}

const CLIENT_ERROR_MAPPING_LIST: Array<ErrorStatusMapping<HTTP_CLIENT_ERROR_CODES>> = [
  {errorClass: InvalidArgument, statusCode: HTTP_CLIENT_ERROR_CODES.BAD_REQUEST},
  {errorClass: Unauthorized, statusCode: HTTP_CLIENT_ERROR_CODES.UNAUTHORIZED},
  {errorClass: PaymentRequired, statusCode: HTTP_CLIENT_ERROR_CODES.PAYMENT_REQUIRED},
  {errorClass: Forbidden, statusCode: HTTP_CLIENT_ERROR_CODES.FORBIDDEN},
  {errorClass: NotFound, statusCode: HTTP_CLIENT_ERROR_CODES.NOT_FOUND},
  {errorClass: MethodNotAllowed, statusCode: HTTP_CLIENT_ERROR_CODES.METHOD_NOT_ALLOWED},
  {errorClass: NotAcceptable, statusCode: HTTP_CLIENT_ERROR_CODES.NOT_ACCEPTABLE},
  {errorClass: ProxyAuthenticationRequired, statusCode: HTTP_CLIENT_ERROR_CODES.PROXY_AUTHENTICATION_REQUIRED},
  {errorClass: RequestTimeout, statusCode: HTTP_CLIENT_ERROR_CODES.REQUEST_TIMEOUT},
  {errorClass: Conflict, statusCode: HTTP_CLIENT_ERROR_CODES.CONFLICT},
  {errorClass: Gone, statusCode: HTTP_CLIENT_ERROR_CODES.GONE},
  {errorClass: LengthRequired, statusCode: HTTP_CLIENT_ERROR_CODES.LENGTH_REQUIRED},
  {errorClass: PreconditionFailed, statusCode: HTTP_CLIENT_ERROR_CODES.PRECONDITION_FAILED},
  {errorClass: PayloadTooLarge, statusCode: HTTP_CLIENT_ERROR_CODES.PAYLOAD_TOO_LARGE},
  {errorClass: UriTooLong, statusCode: HTTP_CLIENT_ERROR_CODES.URI_TOO_LONG},
  {errorClass: UnsupportedMediaType, statusCode: HTTP_CLIENT_ERROR_CODES.UNSUPPORTED_MEDIA_TYPE},
  {errorClass: RangeNotSatisfiable, statusCode: HTTP_CLIENT_ERROR_CODES.RANGE_NOT_SATISFIABLE},
  {errorClass: ExpectationFailed, statusCode: HTTP_CLIENT_ERROR_CODES.EXPECTATION_FAILED},
  {errorClass: ImATeapot, statusCode: HTTP_CLIENT_ERROR_CODES.IM_A_TEAPOT},
  {errorClass: MisdirectedRequest, statusCode: HTTP_CLIENT_ERROR_CODES.MISDIRECTED_REQUEST},
  {errorClass: UnprocessableEntity, statusCode: HTTP_CLIENT_ERROR_CODES.UNPROCESSABLE_ENTITY},
  {errorClass: Locked, statusCode: HTTP_CLIENT_ERROR_CODES.LOCKED},
  {errorClass: FailedDependency, statusCode: HTTP_CLIENT_ERROR_CODES.FAILED_DEPENDENCY},
  {errorClass: TooEarly, statusCode: HTTP_CLIENT_ERROR_CODES.TOO_EARLY},
  {errorClass: UpgradeRequired, statusCode: HTTP_CLIENT_ERROR_CODES.UPGRADE_REQUIRED},
  {errorClass: PreconditionRequired, statusCode: HTTP_CLIENT_ERROR_CODES.PRECONDITION_REQUIRED},
  {errorClass: TooManyRequests, statusCode: HTTP_CLIENT_ERROR_CODES.TOO_MANY_REQUESTS},
  {errorClass: RequestHeaderFieldsTooLarge, statusCode: HTTP_CLIENT_ERROR_CODES.REQUEST_HEADER_FIELDS_TOO_LARGE},
  {errorClass: UnavailableForLegalReasons, statusCode: HTTP_CLIENT_ERROR_CODES.UNAVAILABLE_FOR_LEGAL_REASONS}
];

const SERVER_ERROR_MAPPING_LIST: Array<ErrorStatusMapping<HTTP_SERVER_ERROR_CODES>> = [
  {errorClass: NotImplemented, statusCode: HTTP_SERVER_ERROR_CODES.NOT_IMPLEMENTED},
  {errorClass: BadGateway, statusCode: HTTP_SERVER_ERROR_CODES.BAD_GATEWAY},
  {errorClass: ServiceUnavailable, statusCode: HTTP_SERVER_ERROR_CODES.SERVICE_UNAVAILABLE},
  {errorClass: GatewayTimeout, statusCode: HTTP_SERVER_ERROR_CODES.GATEWAY_TIMEOUT},
  {errorClass: HttpVersionNotSupported, statusCode: HTTP_SERVER_ERROR_CODES.HTTP_VERSION_NOT_SUPPORTED},
  {errorClass: VariantAlsoNegotiates, statusCode: HTTP_SERVER_ERROR_CODES.VARIANT_ALSO_NEGOTIATES},
  {errorClass: InsufficientStorage, statusCode: HTTP_SERVER_ERROR_CODES.INSUFFICIENT_STORAGE},
  {errorClass: LoopDetected, statusCode: HTTP_SERVER_ERROR_CODES.LOOP_DETECTED},
  {errorClass: NotExtended, statusCode: HTTP_SERVER_ERROR_CODES.NOT_EXTENDED},
  {errorClass: NetworkAuthenticationRequired, statusCode: HTTP_SERVER_ERROR_CODES.NETWORK_AUTHENTICATION_REQUIRED}
];

export const errorHandler = (logger: Logger): ErrorRequestHandler => {
  return (error: Error, _request: Request, response: Response, _next: NextFunction): void => {
    logger.error(error);

    const clientErrorMapping = CLIENT_ERROR_MAPPING_LIST.find((mapping) => error instanceof mapping.errorClass);

    if (clientErrorMapping) {
      response.status(clientErrorMapping.statusCode).json(error.message);

      return;
    }

    const serverErrorMapping = SERVER_ERROR_MAPPING_LIST.find((mapping) => error instanceof mapping.errorClass);

    if (serverErrorMapping) {
      response.status(serverErrorMapping.statusCode).end();

      return;
    }

    response.status(HTTP_SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR).json('Unknown error');
  };
};
