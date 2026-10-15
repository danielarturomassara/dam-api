import {ServerError} from '@core/domain/error/ServerError.js';

export class VariantAlsoNegotiates extends ServerError {
  public constructor (message: string = 'Variant also negotiates.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
