import {ProviderApple} from '@account/application/dto/provider/ProviderApple.js';
import {BaseRegistration} from '@account/application/useCase/registration/BaseRegistration.js';
import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {Account} from '@account/domain/entity/Account.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {formatEmail} from '@core/application/stringFormatter.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

const appleUserSchema = FieldSchemas.requiredObject('user', IDENTITY_PROVIDERS.APPLE, {
  email: FieldSchemas.requiredString('user.email', IDENTITY_PROVIDERS.APPLE),
  name: FieldSchemas.requiredObject('user.name', IDENTITY_PROVIDERS.APPLE, {
    firstName: FieldSchemas.requiredString('user.name.firstName', IDENTITY_PROVIDERS.APPLE),
    lastName: FieldSchemas.requiredString('user.name.lastName', IDENTITY_PROVIDERS.APPLE)
  })
});

const appleProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.APPLE, {
  code: FieldSchemas.requiredString('code', IDENTITY_PROVIDERS.APPLE),
  id_token: FieldSchemas.requiredString('id_token', IDENTITY_PROVIDERS.APPLE),
  state: FieldSchemas.requiredString('state', IDENTITY_PROVIDERS.APPLE),
  user: FieldSchemas.optional(appleUserSchema)
});

@injectable()
export class AppleRegistration extends BaseRegistration<ProviderApple> {
  public constructor () {
    super();
  }

  protected async buildAccount (_providerData: ProviderApple): Promise<Account> {
    // TODO(spec §4.5, issue #2): verify id_token against Apple's keys, exchange the code, and take
    // providerUserId and email from Apple's answer — never from the request body.
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
