import {Identity, IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {IdentityFactory} from '@account/domain/entity/IdentityFactory.js';
import {TimestampedEntity, TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface AccountPrimitives extends TimestampedEntityPrimitives {
  disabledAt: Nullable<Date>;
  identities: Array<IdentityPrimitives>;
  primaryEmail: Nullable<string>;
  primaryPhone: Nullable<string>;
}

export interface CreateAccountInput {
  identity: Identity;
  primaryEmail: Nullable<string>;
  primaryPhone: Nullable<string>;
}

export class Account extends TimestampedEntity {
  public readonly primaryEmail: Nullable<Email>;
  public readonly primaryPhone: Nullable<Phone>;
  readonly #disabledAt: Nullable<Date>;
  readonly #identities: Array<Identity>;

  public static create (input: CreateAccountInput): Account {
    return new Account({
      ...TimestampedEntity.buildNew(),
      disabledAt: null,
      identities: [input.identity.toPrimitives()],
      primaryEmail: input.primaryEmail,
      primaryPhone: input.primaryPhone
    });
  }

  public static fromPrimitives (primitives: AccountPrimitives): Account {
    return new Account(primitives);
  }

  public addIdentity (identity: Identity): void {
    this.ensureProviderIsNotHeld(identity.provider);

    this.#identities.push(identity);
  }

  public getIdentities (): ReadonlyArray<Identity> {
    return [...this.#identities];
  }

  public hasIdentities (): boolean {
    return this.#identities.length > 0;
  }

  public isDisabled (): boolean {
    return this.#disabledAt !== null;
  }

  public removeIdentity (identityId: Uuid): void {
    const identityIndex = this.#identities.findIndex((identity) => identity.id.toPrimitives() === identityId.toPrimitives());

    if (identityIndex < 0) {
      throw new NotFound('Identity');
    }

    this.#identities.splice(identityIndex, 1);
  }

  public override toPrimitives (): AccountPrimitives {
    this.ensureHasAtLeastOneIdentity();

    return {
      ...super.toPrimitives(),
      disabledAt: this.#disabledAt,
      identities: this.#identities.map((identity) => identity.toPrimitives()),
      primaryEmail: this.primaryEmail ? this.primaryEmail.toPrimitives() : null,
      primaryPhone: this.primaryPhone ? this.primaryPhone.toPrimitives() : null
    };
  }

  private constructor (primitives: AccountPrimitives) {
    super(primitives);

    this.#disabledAt = primitives.disabledAt;
    this.#identities = primitives.identities.map((identity) => IdentityFactory.fromPrimitives(identity));
    this.primaryEmail = primitives.primaryEmail ? Email.fromPrimitives(primitives.primaryEmail) : null;
    this.primaryPhone = primitives.primaryPhone ? Phone.fromPrimitives(primitives.primaryPhone) : null;

    this.ensureHasAtLeastOneIdentity();
    this.ensureOneIdentityPerProvider();
  }

  private ensureHasAtLeastOneIdentity (): void {
    if (!this.hasIdentities()) {
      throw new InvalidArgument({customMessage: 'An account requires at least one identity.'});
    }
  }

  private ensureOneIdentityPerProvider (): void {
    const providerList = this.#identities.map((identity) => identity.provider);

    for (const [providerIndex, provider] of providerList.entries()) {
      if (providerList.indexOf(provider) !== providerIndex) {
        throw new Conflict(`Identity provider ${provider} is already held`);
      }
    }
  }

  private ensureProviderIsNotHeld (provider: Identity['provider']): void {
    if (this.#identities.some((identity) => identity.provider === provider)) {
      throw new Conflict(`Identity provider ${provider} is already held`);
    }
  }
}
