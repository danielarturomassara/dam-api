import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';

export type CreateIdentityProviderPasswordPrimitives = Omit<IdentityProviderPasswordPrimitives, keyof TimestampedEntityPrimitives>;

export interface IdentityProviderPasswordPrimitives extends BaseIdentityPrimitives {
  hash: string;
  password: string;
  provider: IDENTITY_PROVIDERS.PASSWORD;
}

export class IdentityProviderPassword extends BaseIdentity {
  public readonly hash: TrimmedString;
  public readonly password: TrimmedString;

  public static create (primitives: CreateIdentityProviderPasswordPrimitives): IdentityProviderPassword {
    return new IdentityProviderPassword({
      ...super.buildIdentity(primitives),
      hash: primitives.hash,
      password: primitives.password,
      provider: IDENTITY_PROVIDERS.PASSWORD
    });
  }

  public static fromPrimitives (primitives: IdentityProviderPasswordPrimitives): IdentityProviderPassword {
    return new IdentityProviderPassword(primitives);
  }

  public override toPrimitives (): IdentityProviderPasswordPrimitives {
    return {
      ...super.toPrimitives(),
      hash: this.hash.toPrimitives(),
      password: this.password.toPrimitives(),
      provider: IDENTITY_PROVIDERS.PASSWORD
    };
  }

  private constructor (primitives: IdentityProviderPasswordPrimitives) {
    super(primitives);

    this.hash = TrimmedString.fromPrimitives(primitives.hash);
    this.password = TrimmedString.fromPrimitives(primitives.password);
  }
}
