import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export interface IdentityProviderMetaPrimitives extends BaseIdentityPrimitives {
  email: string;
  passwordHash?: never;
  phone?: never;
  provider: IDENTITY_PROVIDERS.META;
  providerUserId: string;
};

export class IdentityProviderMeta extends BaseIdentity {
  public readonly email: Email;
  public readonly providerUserId: TrimmedString;

  public static create (primitives: IdentityProviderMetaPrimitives): IdentityProviderMeta {
    return new IdentityProviderMeta({
      ...super.buildIdentity(primitives),
      email: primitives.email,
      provider: IDENTITY_PROVIDERS.META,
      providerUserId: primitives.providerUserId
    });
  }

  public static fromPrimitives (primitives: IdentityProviderMetaPrimitives): IdentityProviderMeta {
    return new IdentityProviderMeta(primitives);
  }

  public toPrimitives (): IdentityProviderMetaPrimitives {
    return {
      ...super.toPrimitives(),
      email: this.email.toPrimitives(),
      provider: IDENTITY_PROVIDERS.META,
      providerUserId: this.providerUserId.toPrimitives()
    };
  }

  private constructor (primitives: IdentityProviderMetaPrimitives) {
    super(primitives);

    this.email = Email.fromPrimitives(primitives.email);
    this.providerUserId = TrimmedString.fromPrimitives(primitives.providerUserId);
  }
}
