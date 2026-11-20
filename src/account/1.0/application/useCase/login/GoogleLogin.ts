import {AuthenticatedIdentity, LoginStrategy} from '@account/application/useCase/login/LoginStrategy.js';
import {googleProviderDataSchema} from '@account/application/useCase/registration/googleProviderDataSchema.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

@injectable()
export class GoogleLogin implements LoginStrategy {
  public constructor () {}

  public async authenticate (rawProviderData: unknown): Promise<AuthenticatedIdentity> {
    parseWithSchema(googleProviderDataSchema, rawProviderData);

    throw new NotImplemented(`Login with the ${IDENTITY_PROVIDERS.GOOGLE} provider is not implemented yet.`);
  }
}
