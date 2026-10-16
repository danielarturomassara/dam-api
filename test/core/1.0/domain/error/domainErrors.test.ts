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
import {describe, expect, it} from 'vitest';

// Pins spec/approved/core.spec.md §3.5: every error class, its constructor and its exact message.

const namedErrorList: Array<[string, Error, string]> = [
  ['InvalidArgument (value object)', new InvalidArgument({value: 'x', valueObjectName: 'Email'}), '<Email> does not allow the value <x>'],
  ['InvalidArgument (custom)', new InvalidArgument({customMessage: 'provider is required'}), 'provider is required'],
  ['Unauthorized', new Unauthorized('expired token'), 'Unauthorized. Reason: expired token.'],
  ['Forbidden', new Forbidden(), 'You don\'t have permissions to access this resource.'],
  ['NotFound', new NotFound('Account'), 'Account not found.'],
  ['Conflict', new Conflict('email'), 'Conflict: email.'],
  ['ServerError (message)', new ServerError('database unreachable'), 'Server error. database unreachable'],
  ['ServerError (bare)', new ServerError(), 'Server error. '],
  ['DatabaseError', new DatabaseError(), 'Database error.'],
  ['NotImplemented (default)', new NotImplemented(), 'Not implemented.'],
  ['NotImplemented (custom)', new NotImplemented('Soon.'), 'Soon.']
];

const defaultMessageErrorList: Array<[string, Error, string]> = [
  ['PaymentRequired', new PaymentRequired(), 'Payment required.'],
  ['MethodNotAllowed', new MethodNotAllowed(), 'Method not allowed.'],
  ['NotAcceptable', new NotAcceptable(), 'Not acceptable.'],
  ['ProxyAuthenticationRequired', new ProxyAuthenticationRequired(), 'Proxy authentication required.'],
  ['RequestTimeout', new RequestTimeout(), 'Request timeout.'],
  ['Gone', new Gone(), 'Gone.'],
  ['LengthRequired', new LengthRequired(), 'Length required.'],
  ['PreconditionFailed', new PreconditionFailed(), 'Precondition failed.'],
  ['PayloadTooLarge', new PayloadTooLarge(), 'Payload too large.'],
  ['UriTooLong', new UriTooLong(), 'URI too long.'],
  ['UnsupportedMediaType', new UnsupportedMediaType(), 'Unsupported media type.'],
  ['RangeNotSatisfiable', new RangeNotSatisfiable(), 'Range not satisfiable.'],
  ['ExpectationFailed', new ExpectationFailed(), 'Expectation failed.'],
  ['ImATeapot', new ImATeapot(), 'I\'m a teapot.'],
  ['MisdirectedRequest', new MisdirectedRequest(), 'Misdirected request.'],
  ['UnprocessableEntity', new UnprocessableEntity(), 'Unprocessable entity.'],
  ['Locked', new Locked(), 'Locked.'],
  ['FailedDependency', new FailedDependency(), 'Failed dependency.'],
  ['TooEarly', new TooEarly(), 'Too early.'],
  ['UpgradeRequired', new UpgradeRequired(), 'Upgrade required.'],
  ['PreconditionRequired', new PreconditionRequired(), 'Precondition required.'],
  ['TooManyRequests', new TooManyRequests(), 'Too many requests.'],
  ['RequestHeaderFieldsTooLarge', new RequestHeaderFieldsTooLarge(), 'Request header fields too large.'],
  ['UnavailableForLegalReasons', new UnavailableForLegalReasons(), 'Unavailable for legal reasons.'],
  ['BadGateway', new BadGateway(), 'Bad gateway.'],
  ['ServiceUnavailable', new ServiceUnavailable(), 'Service unavailable.'],
  ['GatewayTimeout', new GatewayTimeout(), 'Gateway timeout.'],
  ['HttpVersionNotSupported', new HttpVersionNotSupported(), 'HTTP version not supported.'],
  ['VariantAlsoNegotiates', new VariantAlsoNegotiates(), 'Variant also negotiates.'],
  ['InsufficientStorage', new InsufficientStorage(), 'Insufficient storage.'],
  ['LoopDetected', new LoopDetected(), 'Loop detected.'],
  ['NotExtended', new NotExtended(), 'Not extended.'],
  ['NetworkAuthenticationRequired', new NetworkAuthenticationRequired(), 'Network authentication required.']
];

const serverErrorFamilyList: Array<[string, Error]> = [
  ['NotImplemented', new NotImplemented()],
  ['BadGateway', new BadGateway()],
  ['ServiceUnavailable', new ServiceUnavailable()],
  ['GatewayTimeout', new GatewayTimeout()],
  ['HttpVersionNotSupported', new HttpVersionNotSupported()],
  ['VariantAlsoNegotiates', new VariantAlsoNegotiates()],
  ['InsufficientStorage', new InsufficientStorage()],
  ['LoopDetected', new LoopDetected()],
  ['NotExtended', new NotExtended()],
  ['NetworkAuthenticationRequired', new NetworkAuthenticationRequired()]
];

describe('@core domain errors', (): void => {
  it.each([...namedErrorList, ...defaultMessageErrorList])('%s carries its exact message', (_errorName: string, error: Error, expectedMessage: string): void => {
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(expectedMessage);
  });

  it.each(defaultMessageErrorList)('%s accepts a custom message verbatim', (_errorName: string, error: Error): void => {
    const ErrorClass = error.constructor as new (message: string) => Error;

    expect(new ErrorClass('custom message').message).toBe('custom message');
  });

  it.each(serverErrorFamilyList)('%s extends ServerError', (_errorName: string, error: Error): void => {
    expect(error).toBeInstanceOf(ServerError);
  });

  it.each([...namedErrorList, ...defaultMessageErrorList])('%s reports its class as the error name', (_errorName: string, error: Error): void => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.name).not.toBe('Error');
  });
});
