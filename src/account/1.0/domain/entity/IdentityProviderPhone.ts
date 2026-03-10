import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Phone} from '@core/domain/valueObject/Phone.js';

export interface IdentityProviderPhonePrimitives extends BaseIdentityPrimitives {
  email?: never;
  passwordHash?: never;
  phone: string;
  provider: IDENTITY_PROVIDERS.PHONE;
  providerUserId?: never;
};

export class IdentityProviderPhone extends BaseIdentity {
  public readonly phone: Phone;

  public static create (primitives: IdentityProviderPhonePrimitives): IdentityProviderPhone {
    return new IdentityProviderPhone({
      ...super.buildIdentity(primitives),
      phone: primitives.phone,
      provider: IDENTITY_PROVIDERS.PHONE
    });
  }

  public static fromPrimitives (primitives: IdentityProviderPhonePrimitives): IdentityProviderPhone {
    return new IdentityProviderPhone(primitives);
  }

  public toPrimitives (): IdentityProviderPhonePrimitives {
    return {
      ...super.toPrimitives(),
      phone: this.phone.toPrimitives(),
      provider: IDENTITY_PROVIDERS.PHONE
    };
  }

  private constructor (primitives: IdentityProviderPhonePrimitives) {
    super(primitives);

    this.phone = Phone.fromPrimitives(primitives.phone);
  }
}
