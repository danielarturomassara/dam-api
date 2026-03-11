import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export interface IdentityProviderPasswordPrimitives extends BaseIdentityPrimitives {
  email: string;
  passwordHash: string;
  phone?: never;
  provider: IDENTITY_PROVIDERS.PASSWORD;
  providerUserId?: never;
};

export class IdentityProviderPassword extends BaseIdentity {
  public readonly email: Email;
  public readonly passwordHash: TrimmedString;

  public static create (primitives: IdentityProviderPasswordPrimitives): IdentityProviderPassword {
    return new IdentityProviderPassword({
      ...super.buildIdentity(primitives),
      email: primitives.email,
      passwordHash: primitives.passwordHash,
      provider: IDENTITY_PROVIDERS.PASSWORD
    });
  }

  public static fromPrimitives (primitives: IdentityProviderPasswordPrimitives): IdentityProviderPassword {
    return new IdentityProviderPassword(primitives);
  }

  public toPrimitives (): IdentityProviderPasswordPrimitives {
    return {
      ...super.toPrimitives(),
      email: this.email.toPrimitives(),
      passwordHash: this.passwordHash.toPrimitives(),
      provider: IDENTITY_PROVIDERS.PASSWORD
    };
  }

  private constructor (primitives: IdentityProviderPasswordPrimitives) {
    super(primitives);

    this.email = Email.fromPrimitives(primitives.email);
    this.passwordHash = TrimmedString.fromPrimitives(primitives.passwordHash);
  }
}
