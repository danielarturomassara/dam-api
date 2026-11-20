import {Forbidden} from '@core/domain/error/Forbidden.js';

export type LoginNotAllowedReason = 'account disabled' | 'identity disabled' | 'identity not verified';

export class LoginNotAllowed extends Forbidden {
  public constructor (public readonly reason: LoginNotAllowedReason) {
    super();

    this.message = `Login not allowed. Reason: ${reason}.`;
  }
}
