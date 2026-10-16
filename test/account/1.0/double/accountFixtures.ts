import {Account} from '@account/domain/entity/Account.js';
import {IdentityProviderGoogle} from '@account/domain/entity/IdentityProviderGoogle.js';
import {IdentityProviderPassword} from '@account/domain/entity/IdentityProviderPassword.js';
import {IdentityProviderPhone} from '@account/domain/entity/IdentityProviderPhone.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export const buildPasswordIdentity = (): IdentityProviderPassword => {
  return IdentityProviderPassword.create({
    disabledAt: null,
    hash: Uuid.create().toPrimitives(),
    password: 'hashed:correct-horse-battery',
    provider: IDENTITY_PROVIDERS.PASSWORD,
    verifiedAt: null
  });
};

export const buildPhoneIdentity = (): IdentityProviderPhone => {
  return IdentityProviderPhone.create({
    code: '123456',
    disabledAt: null,
    provider: IDENTITY_PROVIDERS.PHONE,
    verifiedAt: null
  });
};

export const buildGoogleIdentity = (email: string): IdentityProviderGoogle => {
  return IdentityProviderGoogle.create({
    disabledAt: null,
    email,
    provider: IDENTITY_PROVIDERS.GOOGLE,
    providerUserId: `google-${email}`,
    verifiedAt: new Date('2026-01-05T10:00:00.000Z')
  });
};

export const buildEmailAccount = (email: string): Account => {
  return Account.create({identity: buildPasswordIdentity(), primaryEmail: email, primaryPhone: null});
};

export const buildPhoneAccount = (phone: string): Account => {
  return Account.create({identity: buildPhoneIdentity(), primaryEmail: null, primaryPhone: phone});
};

export const buildGoogleAccount = (email: string): Account => {
  return Account.create({identity: buildGoogleIdentity(email), primaryEmail: email, primaryPhone: null});
};
