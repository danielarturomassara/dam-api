import {ProviderMeta} from '@account/application/dto/provider/ProviderMeta.js';
import {BaseRegistration} from '@account/application/useCase/registration/BaseRegistration.js';
import {metaProviderDataSchema} from '@account/application/useCase/registration/metaProviderDataSchema.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {Account} from '@account/domain/entity/Account.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

@injectable()
export class MetaRegistration extends BaseRegistration<ProviderMeta> {
  public constructor () {
    super();
  }

  protected async buildAccount (_providerData: ProviderMeta): Promise<Account> {
    throw new NotImplemented(`Registration with the ${IDENTITY_PROVIDERS.META} provider is not implemented yet.`);
  }

  protected parseProviderData (rawProviderData: unknown): ProviderMeta {
    return parseWithSchema(metaProviderDataSchema, rawProviderData);
  }
}
