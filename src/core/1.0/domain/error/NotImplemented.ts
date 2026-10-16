import {ServerError} from '@core/domain/error/ServerError.js';

export class NotImplemented extends ServerError {
  public constructor (message: string = 'Not implemented.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
