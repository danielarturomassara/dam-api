import {ProviderApple} from '@account/application/dto/provider/ProviderApple.js';
import {appleProviderDataSchema} from '@account/application/useCase/registration/appleProviderDataSchema.js';
import {BaseRegistration} from '@account/application/useCase/registration/BaseRegistration.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {Account} from '@account/domain/entity/Account.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {formatEmail} from '@core/application/stringFormatter.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

@injectable()
export class AppleRegistration extends BaseRegistration<ProviderApple> {
  public constructor () {
    super();
  }

  protected async buildAccount (_providerData: ProviderApple): Promise<Account> {
    throw new NotImplemented(`Registration with the ${IDENTITY_PROVIDERS.APPLE} provider is not implemented yet.`);
  }

  protected parseProviderData (rawProviderData: unknown): ProviderApple {
    const providerData = parseWithSchema(appleProviderDataSchema, rawProviderData);

    if (!providerData.user) {
      return providerData;
    }

    return {...providerData, user: {...providerData.user, email: formatEmail(providerData.user.email)}};
  }
}
