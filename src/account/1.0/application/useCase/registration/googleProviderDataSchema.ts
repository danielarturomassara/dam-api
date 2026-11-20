import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

export const googleProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.GOOGLE, {
  access_token: FieldSchemas.requiredString('access_token', IDENTITY_PROVIDERS.GOOGLE),
  expires_in: FieldSchemas.requiredNumber('expires_in', IDENTITY_PROVIDERS.GOOGLE),
  id_token: FieldSchemas.requiredString('id_token', IDENTITY_PROVIDERS.GOOGLE),
  refresh_token: FieldSchemas.optional(FieldSchemas.requiredString('refresh_token', IDENTITY_PROVIDERS.GOOGLE)),
  scope: FieldSchemas.requiredString('scope', IDENTITY_PROVIDERS.GOOGLE),
  token_type: FieldSchemas.requiredString('token_type', IDENTITY_PROVIDERS.GOOGLE)
});
