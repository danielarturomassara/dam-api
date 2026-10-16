import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {TimestampedEntity, TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {Nullable} from '@core/domain/type/Nullable.js';

export interface BaseIdentityPrimitives extends TimestampedEntityPrimitives {
  disabledAt: Nullable<Date>;
  provider: IDENTITY_PROVIDERS;
  verifiedAt: Nullable<Date>;
}

export type CreateBaseIdentityPrimitives = Omit<BaseIdentityPrimitives, keyof TimestampedEntityPrimitives>;

export abstract class BaseIdentity extends TimestampedEntity {
  public readonly provider: IDENTITY_PROVIDERS;
  #disabledAt: Nullable<Date>;
  #verifiedAt: Nullable<Date>;

  protected static buildIdentity (primitives: CreateBaseIdentityPrimitives): BaseIdentityPrimitives {
    return {
      ...super.buildNew(),
      disabledAt: primitives.disabledAt,
      provider: primitives.provider,
      verifiedAt: primitives.verifiedAt
    };
  }

  public disable (): void {
    if (this.isDisabled()) {
      throw new Conflict('Identity is already disabled');
    }

    this.#disabledAt = new Date();
  }

  public enable (): void {
    if (!this.isDisabled()) {
      throw new Conflict('Identity is already enabled');
    }

    this.#disabledAt = null;
  }

  public isDisabled (): boolean {
    return this.#disabledAt !== null;
  }

  public isVerified (): boolean {
    return this.#verifiedAt !== null;
  }

  public override toPrimitives (): BaseIdentityPrimitives {
    return {
      ...super.toPrimitives(),
      disabledAt: this.#disabledAt,
      provider: this.provider,
      verifiedAt: this.#verifiedAt
    };
  }

  public verify (): void {
    if (this.isVerified()) {
      throw new Conflict('Identity is already verified');
    }

    this.#verifiedAt = new Date();
  }

  protected constructor (primitives: BaseIdentityPrimitives) {
    super(primitives);

    this.#disabledAt = primitives.disabledAt;
    this.provider = primitives.provider;
    this.#verifiedAt = primitives.verifiedAt;
  }
}
