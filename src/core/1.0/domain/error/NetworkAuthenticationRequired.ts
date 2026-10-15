import {ServerError} from '@core/domain/error/ServerError.js';

export class NetworkAuthenticationRequired extends ServerError {
  public constructor (message: string = 'Network authentication required.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
