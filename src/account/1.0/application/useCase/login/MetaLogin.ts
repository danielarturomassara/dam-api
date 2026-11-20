import {AuthenticatedIdentity, LoginStrategy} from '@account/application/useCase/login/LoginStrategy.js';
import {metaProviderDataSchema} from '@account/application/useCase/registration/metaProviderDataSchema.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

@injectable()
export class MetaLogin implements LoginStrategy {
  public constructor () {}

  public async authenticate (rawProviderData: unknown): Promise<AuthenticatedIdentity> {
    parseWithSchema(metaProviderDataSchema, rawProviderData);

    throw new NotImplemented(`Login with the ${IDENTITY_PROVIDERS.META} provider is not implemented yet.`);
  }
}
