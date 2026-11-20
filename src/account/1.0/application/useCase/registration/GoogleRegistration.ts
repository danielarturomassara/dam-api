import {ProviderGoogle} from '@account/application/dto/provider/ProviderGoogle.js';
import {BaseRegistration} from '@account/application/useCase/registration/BaseRegistration.js';
import {googleProviderDataSchema} from '@account/application/useCase/registration/googleProviderDataSchema.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {Account} from '@account/domain/entity/Account.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

@injectable()
export class GoogleRegistration extends BaseRegistration<ProviderGoogle> {
  public constructor () {
    super();
  }

  protected async buildAccount (_providerData: ProviderGoogle): Promise<Account> {
    throw new NotImplemented(`Registration with the ${IDENTITY_PROVIDERS.GOOGLE} provider is not implemented yet.`);
  }

  protected parseProviderData (rawProviderData: unknown): ProviderGoogle {
    return parseWithSchema(googleProviderDataSchema, rawProviderData);
  }
}
