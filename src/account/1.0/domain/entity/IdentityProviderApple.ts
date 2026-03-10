import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export interface IdentityProviderApplePrimitives extends BaseIdentityPrimitives {
  email: string;
  passwordHash?: never;
  phone?: never;
  provider: IDENTITY_PROVIDERS.APPLE;
  providerUserId: string;
};

export class IdentityProviderApple extends BaseIdentity {
  public readonly email: Email;
  public readonly providerUserId: TrimmedString;

  public static create (primitives: IdentityProviderApplePrimitives): IdentityProviderApple {
    return new IdentityProviderApple({
      ...super.buildIdentity(primitives),
      email: primitives.email,
      provider: IDENTITY_PROVIDERS.APPLE,
      providerUserId: primitives.providerUserId
    });
  }

  public static fromPrimitives (primitives: IdentityProviderApplePrimitives): IdentityProviderApple {
    return new IdentityProviderApple(primitives);
  }

  public toPrimitives (): IdentityProviderApplePrimitives {
    return {
      ...super.toPrimitives(),
      email: this.email.toPrimitives(),
      provider: IDENTITY_PROVIDERS.APPLE,
      providerUserId: this.providerUserId.toPrimitives()
    };
  }

  private constructor (primitives: IdentityProviderApplePrimitives) {
    super(primitives);

    this.email = Email.fromPrimitives(primitives.email);
    this.providerUserId = TrimmedString.fromPrimitives(primitives.providerUserId);
  }
}
