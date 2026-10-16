import {ServerError} from '@core/domain/error/ServerError.js';

export class LoopDetected extends ServerError {
  public constructor (message: string = 'Loop detected.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
