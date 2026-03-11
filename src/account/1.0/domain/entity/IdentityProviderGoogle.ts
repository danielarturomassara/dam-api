import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export interface IdentityProviderGooglePrimitives extends BaseIdentityPrimitives {
  email: string;
  passwordHash?: never;
  phone?: never;
  provider: IDENTITY_PROVIDERS.GOOGLE;
  providerUserId: string;
};

export class IdentityProviderGoogle extends BaseIdentity {
  public readonly email: Email;
  public readonly providerUserId: TrimmedString;

  public static create (primitives: IdentityProviderGooglePrimitives): IdentityProviderGoogle {
    return new IdentityProviderGoogle({
      ...super.buildIdentity(primitives),
      email: primitives.email,
      provider: IDENTITY_PROVIDERS.GOOGLE,
      providerUserId: primitives.providerUserId
    });
  }

  public static fromPrimitives (primitives: IdentityProviderGooglePrimitives): IdentityProviderGoogle {
    return new IdentityProviderGoogle(primitives);
  }

  public toPrimitives (): IdentityProviderGooglePrimitives {
    return {
      ...super.toPrimitives(),
      email: this.email.toPrimitives(),
      provider: IDENTITY_PROVIDERS.GOOGLE,
      providerUserId: this.providerUserId.toPrimitives()
    };
  }

  private constructor (primitives: IdentityProviderGooglePrimitives) {
    super(primitives);

    this.email = Email.fromPrimitives(primitives.email);
    this.providerUserId = TrimmedString.fromPrimitives(primitives.providerUserId);
  }
}
