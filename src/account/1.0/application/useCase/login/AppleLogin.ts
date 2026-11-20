import {AuthenticatedIdentity, LoginStrategy} from '@account/application/useCase/login/LoginStrategy.js';
import {appleProviderDataSchema} from '@account/application/useCase/registration/appleProviderDataSchema.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

@injectable()
export class AppleLogin implements LoginStrategy {
  public constructor () {}

  public async authenticate (rawProviderData: unknown): Promise<AuthenticatedIdentity> {
    parseWithSchema(appleProviderDataSchema, rawProviderData);

    throw new NotImplemented(`Login with the ${IDENTITY_PROVIDERS.APPLE} provider is not implemented yet.`);
  }
}
