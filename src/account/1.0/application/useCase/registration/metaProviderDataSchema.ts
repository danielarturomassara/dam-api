import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

export const metaProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.META, {
  authResponse: FieldSchemas.requiredObject('authResponse', IDENTITY_PROVIDERS.META, {
    accessToken: FieldSchemas.requiredString('authResponse.accessToken', IDENTITY_PROVIDERS.META),
    expiresIn: FieldSchemas.requiredNumberOrString('authResponse.expiresIn', IDENTITY_PROVIDERS.META),
    userID: FieldSchemas.requiredString('authResponse.userID', IDENTITY_PROVIDERS.META)
  }),
  status: FieldSchemas.requiredString('status', IDENTITY_PROVIDERS.META)
});
