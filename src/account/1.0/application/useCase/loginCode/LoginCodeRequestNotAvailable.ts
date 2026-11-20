import {LoginCodeRequestStrategy} from '@account/application/useCase/loginCode/LoginCodeRequestStrategy.js';
import {parseLoginCodePhone} from '@account/application/useCase/loginCode/parseLoginCodePhone.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

@injectable()
export class LoginCodeRequestNotAvailable implements LoginCodeRequestStrategy {
  public constructor () {}

  public async request (rawProviderData: unknown): Promise<void> {
    parseLoginCodePhone(rawProviderData);

    throw new NotImplemented('Login code delivery is not implemented yet.');
  }
}
