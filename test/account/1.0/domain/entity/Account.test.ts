import {Account} from '@account/domain/entity/Account.js';
import {TimestampedEntity} from '@core/domain/entity/TimestampedEntity.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {describe, expect, it} from 'vitest';

import {buildEmailAccount, buildGoogleIdentity, buildPasswordIdentity, buildPhoneIdentity} from '../../double/accountFixtures.js';

// Pins spec/approved/account.spec.md §3.2 and §4.1.

describe('Account', (): void => {
  it('extends TimestampedEntity and is created enabled with exactly the given identity', (): void => {
    const identity = buildPasswordIdentity();

    const account = Account.create({identity, primaryEmail: 'someone@example.com', primaryPhone: null});
    const primitives = account.toPrimitives();

    expect(account).toBeInstanceOf(TimestampedEntity);
    expect(account.isDisabled()).toBe(false);
    expect(primitives.disabledAt).toBeNull();
    expect(primitives.primaryEmail).toBe('someone@example.com');
    expect(primitives.primaryPhone).toBeNull();
    expect(primitives.identities).toStrictEqual([identity.toPrimitives()]);
    expect(primitives.createdAt).toStrictEqual(primitives.updatedAt);
  });

  it('round-trips through primitives', (): void => {
    const primitives = buildEmailAccount('someone@example.com').toPrimitives();

    expect(Account.fromPrimitives(primitives).toPrimitives()).toStrictEqual(primitives);
  });

  it('refuses to hydrate with an empty identity list', (): void => {
    const primitives = {...buildEmailAccount('someone@example.com').toPrimitives(), identities: []};

    expect((): unknown => Account.fromPrimitives(primitives))
      .toThrow(new InvalidArgument({customMessage: 'An account requires at least one identity.'}));
  });

  it('refuses to serialize once its last identity is removed', (): void => {
    const identity = buildPasswordIdentity();
    const account = Account.create({identity, primaryEmail: 'someone@example.com', primaryPhone: null});

    account.removeIdentity(identity.id);

    expect(account.hasIdentities()).toBe(false);
    expect((): unknown => account.toPrimitives())
      .toThrow(new InvalidArgument({customMessage: 'An account requires at least one identity.'}));
  });

  it('refuses to remove an identity it does not hold', (): void => {
    const account = buildEmailAccount('someone@example.com');

    expect((): void => account.removeIdentity(Uuid.create())).toThrow(new NotFound('Identity'));
    expect(account.hasIdentities()).toBe(true);
  });

  it('holds at most one identity per provider', (): void => {
    const account = buildEmailAccount('someone@example.com');

    account.addIdentity(buildPhoneIdentity());
    account.addIdentity(buildGoogleIdentity('someone@gmail.com'));

    expect(account.toPrimitives().identities).toHaveLength(3);
    expect((): void => account.addIdentity(buildPasswordIdentity())).toThrow(Conflict);
    expect((): void => account.addIdentity(buildPhoneIdentity())).toThrow('Conflict: Identity provider phone is already held.');
  });

  it('refuses to hydrate two identities of the same provider', (): void => {
    const account = buildEmailAccount('someone@example.com');
    const primitives = {...account.toPrimitives(), identities: [buildPasswordIdentity().toPrimitives(), buildPasswordIdentity().toPrimitives()]};

    expect((): unknown => Account.fromPrimitives(primitives)).toThrow(Conflict);
  });

  it('exposes its identities read-only so they change only through the entity', (): void => {
    const account = buildEmailAccount('someone@example.com');

    // @ts-expect-error identities are not assignable from outside the entity
    account.identities = [];
    // @ts-expect-error the identity list cannot be mutated from outside the entity
    account.getIdentities().push(buildPhoneIdentity());

    expect(account.getIdentities()).toHaveLength(1);
  });

  it('refuses an invalid primary contact', (): void => {
    expect((): unknown => Account.create({identity: buildPasswordIdentity(), primaryEmail: 'not-an-email', primaryPhone: null})).toThrow(InvalidArgument);
    expect((): unknown => Account.create({identity: buildPhoneIdentity(), primaryEmail: null, primaryPhone: '600123456'})).toThrow(InvalidArgument);
  });
});
