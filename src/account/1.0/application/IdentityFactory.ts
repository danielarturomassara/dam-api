import {CreateIdentityPrimitives, Identity, IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {IdentityProviderApple, IdentityProviderApplePrimitives} from '@account/domain/entity/IdentityProviderApple.js';
import {IdentityProviderGoogle, IdentityProviderGooglePrimitives} from '@account/domain/entity/IdentityProviderGoogle.js';
import {IdentityProviderMeta, IdentityProviderMetaPrimitives} from '@account/domain/entity/IdentityProviderMeta.js';
import {IdentityProviderPassword, IdentityProviderPasswordPrimitives} from '@account/domain/entity/IdentityProviderPassword.js';
import {IdentityProviderPhone, IdentityProviderPhonePrimitives} from '@account/domain/entity/IdentityProviderPhone.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

type Resolver = (primitives: CreateIdentityPrimitives|IdentityPrimitives) => Identity;

const fromPrimitivesByProvider = {
  [IDENTITY_PROVIDERS.APPLE]: (primitives): Identity => IdentityProviderApple.fromPrimitives(primitives as IdentityProviderApplePrimitives),
  [IDENTITY_PROVIDERS.GOOGLE]: (primitives): Identity => IdentityProviderGoogle.fromPrimitives(primitives as IdentityProviderGooglePrimitives),
  [IDENTITY_PROVIDERS.META]: (primitives): Identity => IdentityProviderMeta.fromPrimitives(primitives as IdentityProviderMetaPrimitives),
  [IDENTITY_PROVIDERS.PASSWORD]: (primitives): Identity => IdentityProviderPassword.fromPrimitives(primitives as IdentityProviderPasswordPrimitives),
  [IDENTITY_PROVIDERS.PHONE]: (primitives): Identity => IdentityProviderPhone.fromPrimitives(primitives as IdentityProviderPhonePrimitives)
} satisfies Record<IDENTITY_PROVIDERS, Resolver>;

const createByProvider = {
  [IDENTITY_PROVIDERS.APPLE]: (primitives): Identity => IdentityProviderApple.create(primitives as IdentityProviderApplePrimitives),
  [IDENTITY_PROVIDERS.GOOGLE]: (primitives): Identity => IdentityProviderGoogle.create(primitives as IdentityProviderGooglePrimitives),
  [IDENTITY_PROVIDERS.META]: (primitives): Identity => IdentityProviderMeta.create(primitives as IdentityProviderMetaPrimitives),
  [IDENTITY_PROVIDERS.PASSWORD]: (primitives): Identity => IdentityProviderPassword.create(primitives as IdentityProviderPasswordPrimitives),
  [IDENTITY_PROVIDERS.PHONE]: (primitives): Identity => IdentityProviderPhone.create(primitives as IdentityProviderPhonePrimitives)
} satisfies Record<IDENTITY_PROVIDERS, Resolver>;

export class IdentityFactory {
  public static fromPrimitives (primitives: IdentityPrimitives): Identity {
    const resolver = fromPrimitivesByProvider[primitives.provider];

    if (!resolver) {
      throw new InvalidArgument({value: String(primitives.provider), valueObjectName: 'provider'});
    }

    return resolver(primitives);
  }

  public static create (primitives: CreateIdentityPrimitives): Identity {
    const resolver = createByProvider[primitives.provider];

    if (!resolver) {
      throw new InvalidArgument({value: String(primitives.provider), valueObjectName: 'provider'});
    }

    return resolver(primitives);
  }
}
