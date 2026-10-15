import {ServerError} from '@core/domain/error/ServerError.js';

export class HttpVersionNotSupported extends ServerError {
  public constructor (message: string = 'HTTP version not supported.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
