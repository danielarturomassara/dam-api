import {Identity, IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {IdentityProviderApple} from '@account/domain/entity/IdentityProviderApple.js';
import {IdentityProviderGoogle} from '@account/domain/entity/IdentityProviderGoogle.js';
import {IdentityProviderMeta} from '@account/domain/entity/IdentityProviderMeta.js';
import {IdentityProviderPassword} from '@account/domain/entity/IdentityProviderPassword.js';
import {IdentityProviderPhone} from '@account/domain/entity/IdentityProviderPhone.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

export class IdentityFactory {
  public static fromPrimitives (primitives: IdentityPrimitives): Identity {
    const providerValue: unknown = primitives.provider;

    switch (primitives.provider) {
      case IDENTITY_PROVIDERS.APPLE:
        return IdentityProviderApple.fromPrimitives(primitives);
      case IDENTITY_PROVIDERS.GOOGLE:
        return IdentityProviderGoogle.fromPrimitives(primitives);
      case IDENTITY_PROVIDERS.META:
        return IdentityProviderMeta.fromPrimitives(primitives);
      case IDENTITY_PROVIDERS.PASSWORD:
        return IdentityProviderPassword.fromPrimitives(primitives);
      case IDENTITY_PROVIDERS.PHONE:
        return IdentityProviderPhone.fromPrimitives(primitives);
      default:
        throw new InvalidArgument({value: providerValue, valueObjectName: 'provider'});
    }
  }
}
