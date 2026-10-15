import {ServerError} from '@core/domain/error/ServerError.js';

export class NotExtended extends ServerError {
  public constructor (message: string = 'Not extended.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
