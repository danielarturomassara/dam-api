import {normalizePhone} from '@account/application/normalizePhone.js';
import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Phone} from '@core/domain/valueObject/Phone.js';

const loginCodePhoneProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.PHONE, {
  phone: FieldSchemas.requiredString('phone', IDENTITY_PROVIDERS.PHONE)
});

export const parseLoginCodePhone = (rawProviderData: unknown): Phone => {
  const providerData = parseWithSchema(loginCodePhoneProviderDataSchema, rawProviderData);

  return Phone.fromPrimitives(normalizePhone(providerData.phone));
};
