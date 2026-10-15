import {ProviderMeta} from '@account/application/dto/provider/ProviderMeta.js';
import {BaseRegistration} from '@account/application/useCase/registration/BaseRegistration.js';
import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {Account} from '@account/domain/entity/Account.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

const metaProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.META, {
  authResponse: FieldSchemas.requiredObject('authResponse', IDENTITY_PROVIDERS.META, {
    accessToken: FieldSchemas.requiredString('authResponse.accessToken', IDENTITY_PROVIDERS.META),
    expiresIn: FieldSchemas.requiredNumberOrString('authResponse.expiresIn', IDENTITY_PROVIDERS.META),
    userID: FieldSchemas.requiredString('authResponse.userID', IDENTITY_PROVIDERS.META)
  }),
  status: FieldSchemas.requiredString('status', IDENTITY_PROVIDERS.META)
});

@injectable()
export class MetaRegistration extends BaseRegistration<ProviderMeta> {
  public constructor () {
    super();
  }

  protected async buildAccount (_providerData: ProviderMeta): Promise<Account> {
    // TODO(spec §4.5, issue #2): verify accessToken through the Graph API debug_token endpoint and
    // take providerUserId and email from Meta's answer — never from the request body.
    throw new NotImplemented(`Registration with the ${IDENTITY_PROVIDERS.META} provider is not implemented yet.`);
  }

  protected parseProviderData (rawProviderData: unknown): ProviderMeta {
    return parseWithSchema(metaProviderDataSchema, rawProviderData);
  }
}
