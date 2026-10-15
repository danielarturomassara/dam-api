import {ProviderGoogle} from '@account/application/dto/provider/ProviderGoogle.js';
import {BaseRegistration} from '@account/application/useCase/registration/BaseRegistration.js';
import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {Account} from '@account/domain/entity/Account.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {NotImplemented} from '@core/domain/error/NotImplemented.js';
import {injectable} from 'inversify';

const googleProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.GOOGLE, {
  access_token: FieldSchemas.requiredString('access_token', IDENTITY_PROVIDERS.GOOGLE),
  expires_in: FieldSchemas.requiredNumber('expires_in', IDENTITY_PROVIDERS.GOOGLE),
  id_token: FieldSchemas.requiredString('id_token', IDENTITY_PROVIDERS.GOOGLE),
  refresh_token: FieldSchemas.optional(FieldSchemas.requiredString('refresh_token', IDENTITY_PROVIDERS.GOOGLE)),
  scope: FieldSchemas.requiredString('scope', IDENTITY_PROVIDERS.GOOGLE),
  token_type: FieldSchemas.requiredString('token_type', IDENTITY_PROVIDERS.GOOGLE)
});

@injectable()
export class GoogleRegistration extends BaseRegistration<ProviderGoogle> {
  public constructor () {
    super();
  }

  protected async buildAccount (_providerData: ProviderGoogle): Promise<Account> {
    // TODO(spec §4.5, issue #2): verify id_token against Google's keys and take providerUserId and
    // email from Google's answer — never from the request body.
    throw new NotImplemented(`Registration with the ${IDENTITY_PROVIDERS.GOOGLE} provider is not implemented yet.`);
  }

  protected parseProviderData (rawProviderData: unknown): ProviderGoogle {
    return parseWithSchema(googleProviderDataSchema, rawProviderData);
  }
}
