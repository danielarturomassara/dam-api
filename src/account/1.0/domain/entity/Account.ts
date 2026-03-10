import {IdentityFactory} from '@account/application/IdentityFactory.js';
import {Identity, IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {BaseEntity, BaseEntityPrimitives} from '@core/domain/entity/BaseEntity.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';

export interface AccountPrimitives extends BaseEntityPrimitives {
  disabledAt: Nullable<Date>;
  identities: Array<IdentityPrimitives>;
  primaryEmail: Nullable<string>;
  primaryPhone: Nullable<string>;
}

export type CreateAccountPrimitives = Omit<AccountPrimitives, keyof BaseEntityPrimitives>;

export class Account extends BaseEntity {
  public disabledAt: Nullable<Date>;
  public identities: Array<Identity>;
  public primaryEmail: Nullable<Email>;
  public primaryPhone: Nullable<Phone>;

  public static fromPrimitives (primitives: AccountPrimitives): Account {
    return new Account(primitives);
  }

  public static create (primitives: CreateAccountPrimitives): Account {
    return new Account({
      ...BaseEntity.buildNew(),
      disabledAt: null,
      identities: primitives.identities,
      primaryEmail: primitives.primaryEmail,
      primaryPhone: primitives.primaryPhone
    });
  }

  public toPrimitives (): AccountPrimitives {
    return {
      ...super.toPrimitives(),
      disabledAt: this.disabledAt,
      identities: this.identities.map(identity => identity.toPrimitives()),
      primaryEmail: this.primaryEmail ? this.primaryEmail.toPrimitives() : null,
      primaryPhone: this.primaryPhone ? this.primaryPhone.toPrimitives() : null
    };
  }

  private constructor (primitives: AccountPrimitives) {
    super(primitives);

    this.disabledAt = primitives.disabledAt;
    this.identities = primitives.identities.map(identity => IdentityFactory.fromPrimitives(identity));
    this.primaryEmail = primitives.primaryEmail ? Email.fromPrimitives(primitives.primaryEmail) : null;
    this.primaryPhone = primitives.primaryPhone ? Phone.fromPrimitives(primitives.primaryPhone) : null;
  }
}
