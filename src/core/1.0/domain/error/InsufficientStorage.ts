import {ServerError} from '@core/domain/error/ServerError.js';

export class InsufficientStorage extends ServerError {
  public constructor (message: string = 'Insufficient storage.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
