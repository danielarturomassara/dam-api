import {ServerError} from '@core/domain/error/ServerError.js';

export class BadGateway extends ServerError {
  public constructor (message: string = 'Bad gateway.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
