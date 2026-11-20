import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

const appleUserSchema = FieldSchemas.requiredObject('user', IDENTITY_PROVIDERS.APPLE, {
  email: FieldSchemas.requiredString('user.email', IDENTITY_PROVIDERS.APPLE),
  name: FieldSchemas.requiredObject('user.name', IDENTITY_PROVIDERS.APPLE, {
    firstName: FieldSchemas.requiredString('user.name.firstName', IDENTITY_PROVIDERS.APPLE),
    lastName: FieldSchemas.requiredString('user.name.lastName', IDENTITY_PROVIDERS.APPLE)
  })
});

export const appleProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.APPLE, {
  code: FieldSchemas.requiredString('code', IDENTITY_PROVIDERS.APPLE),
  id_token: FieldSchemas.requiredString('id_token', IDENTITY_PROVIDERS.APPLE),
  state: FieldSchemas.requiredString('state', IDENTITY_PROVIDERS.APPLE),
  user: FieldSchemas.optional(appleUserSchema)
});
