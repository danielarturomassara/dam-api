import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {IDENTITY_VERIFICATION_MODES} from '@account/domain/IdentityVerificationModes.js';
import {TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';

export type CreateIdentityProviderPhonePrimitives = Omit<IdentityProviderPhonePrimitives, keyof TimestampedEntityPrimitives>;

export interface IdentityProviderPhonePrimitives extends BaseIdentityPrimitives {
  provider: IDENTITY_PROVIDERS.PHONE;
}

export class IdentityProviderPhone extends BaseIdentity {
  public static create (primitives: CreateIdentityProviderPhonePrimitives): IdentityProviderPhone {
    return new IdentityProviderPhone({
      ...super.buildIdentity(primitives),
      provider: IDENTITY_PROVIDERS.PHONE
    });
  }

  public static fromPrimitives (primitives: IdentityProviderPhonePrimitives): IdentityProviderPhone {
    return new IdentityProviderPhone(primitives);
  }

  public getVerificationMode (): IDENTITY_VERIFICATION_MODES {
    return IDENTITY_VERIFICATION_MODES.BY_LOGIN;
  }

  public override toPrimitives (): IdentityProviderPhonePrimitives {
    return {
      ...super.toPrimitives(),
      provider: IDENTITY_PROVIDERS.PHONE
    };
  }

  private constructor (primitives: IdentityProviderPhonePrimitives) {
    super(primitives);
  }
}
