import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {VerificationCode} from '@account/domain/valueObject/VerificationCode.js';
import {TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';

export type CreateIdentityProviderPhonePrimitives = Omit<IdentityProviderPhonePrimitives, keyof TimestampedEntityPrimitives>;

export interface IdentityProviderPhonePrimitives extends BaseIdentityPrimitives {
  code: string;
  provider: IDENTITY_PROVIDERS.PHONE;
}

export class IdentityProviderPhone extends BaseIdentity {
  public readonly code: VerificationCode;

  public static create (primitives: CreateIdentityProviderPhonePrimitives): IdentityProviderPhone {
    return new IdentityProviderPhone({
      ...super.buildIdentity(primitives),
      code: primitives.code,
      provider: IDENTITY_PROVIDERS.PHONE
    });
  }

  public static fromPrimitives (primitives: IdentityProviderPhonePrimitives): IdentityProviderPhone {
    return new IdentityProviderPhone(primitives);
  }

  public override toPrimitives (): IdentityProviderPhonePrimitives {
    return {
      ...super.toPrimitives(),
      code: this.code.toPrimitives(),
      provider: IDENTITY_PROVIDERS.PHONE
    };
  }

  private constructor (primitives: IdentityProviderPhonePrimitives) {
    super(primitives);

    this.code = VerificationCode.fromPrimitives(primitives.code);
  }
}
