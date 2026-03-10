import {IdentityProviderApple, IdentityProviderApplePrimitives} from '@account/domain/entity/IdentityProviderApple.js';
import {IdentityProviderGoogle, IdentityProviderGooglePrimitives} from '@account/domain/entity/IdentityProviderGoogle.js';
import {IdentityProviderMeta, IdentityProviderMetaPrimitives} from '@account/domain/entity/IdentityProviderMeta.js';
import {IdentityProviderPassword, IdentityProviderPasswordPrimitives} from '@account/domain/entity/IdentityProviderPassword.js';
import {IdentityProviderPhone, IdentityProviderPhonePrimitives} from '@account/domain/entity/IdentityProviderPhone.js';
import {BaseEntityPrimitives} from '@core/domain/entity/BaseEntity.js';

export type CreateIdentityPrimitives = Omit<IdentityPrimitives, keyof BaseEntityPrimitives>;

export type Identity =
  | IdentityProviderApple
  | IdentityProviderGoogle
  | IdentityProviderMeta
  | IdentityProviderPassword
  | IdentityProviderPhone;

export type IdentityPrimitives =
  | IdentityProviderApplePrimitives
  | IdentityProviderGooglePrimitives
  | IdentityProviderMetaPrimitives
  | IdentityProviderPasswordPrimitives
  | IdentityProviderPhonePrimitives;
