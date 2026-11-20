import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

export class VerificationNotProven extends InvalidArgument {
  public constructor () {
    super({customMessage: 'Invalid or expired verification'});
  }
}
