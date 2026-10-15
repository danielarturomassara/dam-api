import {ServerError} from '@core/domain/error/ServerError.js';

export class ServiceUnavailable extends ServerError {
  public constructor (message: string = 'Service unavailable.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
