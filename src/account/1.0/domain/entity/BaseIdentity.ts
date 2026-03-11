import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {BaseEntity, BaseEntityPrimitives} from '@core/domain/entity/BaseEntity.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {Nullable} from '@core/domain/type/Nullable.js';

export interface BaseIdentityPrimitives extends BaseEntityPrimitives {
  disabledAt: Nullable<Date>;
  provider: IDENTITY_PROVIDERS;
  verifiedAt: Nullable<Date>;
};

export abstract class BaseIdentity extends BaseEntity {
  public disabledAt: Nullable<Date>;
  public provider: IDENTITY_PROVIDERS;
  public verifiedAt: Nullable<Date>;

  protected static buildIdentity (primitives: BaseIdentityPrimitives): BaseIdentityPrimitives {
    return {
      ...BaseEntity.buildNew(),
      disabledAt: primitives.disabledAt,
      provider: primitives.provider,
      verifiedAt: primitives.verifiedAt
    };
  }

  public disable (): void {
    if (this.disabledAt) {
      throw new Conflict('Identity is already disabled.');
    }

    this.disabledAt = new Date();
  }

  public enable (): void {
    this.disabledAt = null;
  }

  public isDisabled (): boolean {
    return this.disabledAt !== null;
  }

  public verify (): void {
    if (this.verifiedAt) {
      throw new Conflict('Identity is already verified.');
    }

    this.verifiedAt = new Date();
  }

  public override toPrimitives (): BaseIdentityPrimitives {
    return {
      ...super.toPrimitives(),
      disabledAt: this.disabledAt,
      provider: this.provider,
      verifiedAt: this.verifiedAt
    };
  }

  protected constructor (primitives: BaseIdentityPrimitives) {
    super(primitives);

    this.disabledAt = primitives.disabledAt;
    this.provider = primitives.provider;
    this.verifiedAt = primitives.verifiedAt;
  }
}
