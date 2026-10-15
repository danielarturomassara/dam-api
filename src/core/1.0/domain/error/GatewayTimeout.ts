import {ServerError} from '@core/domain/error/ServerError.js';

export class GatewayTimeout extends ServerError {
  public constructor (message: string = 'Gateway timeout.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
