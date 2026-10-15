import {TimestampedEntity} from '@core/domain/entity/TimestampedEntity.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {describe, expect, it} from 'vitest';

import {buildPasswordIdentity} from '../../double/accountFixtures.js';

// Pins spec/approved/account.spec.md §4.1: every identity extends TimestampedEntity and refuses a repeated
// verify, enable or disable with Conflict.

describe('BaseIdentity', (): void => {
  it('extends TimestampedEntity and starts enabled and unverified', (): void => {
    const identity = buildPasswordIdentity();

    expect(identity).toBeInstanceOf(TimestampedEntity);
    expect(identity.isDisabled()).toBe(false);
    expect(identity.isVerified()).toBe(false);
    expect(identity.toPrimitives()).toMatchObject({disabledAt: null, verifiedAt: null});
  });

  it('disables once and refuses a second disable', (): void => {
    const identity = buildPasswordIdentity();

    identity.disable();

    expect(identity.isDisabled()).toBe(true);
    expect(identity.toPrimitives().disabledAt).toBeInstanceOf(Date);
    expect((): void => identity.disable()).toThrow(Conflict);
    expect((): void => identity.disable()).toThrow('Conflict: Identity is already disabled.');
  });

  it('enables a disabled identity and refuses a second enable', (): void => {
    const identity = buildPasswordIdentity();

    identity.disable();
    identity.enable();

    expect(identity.isDisabled()).toBe(false);
    expect((): void => identity.enable()).toThrow(Conflict);
    expect((): void => identity.enable()).toThrow('Conflict: Identity is already enabled.');
  });

  it('changes verifiedAt and disabledAt only through its methods', (): void => {
    const identity = buildPasswordIdentity();

    // @ts-expect-error verifiedAt is not assignable from outside the entity
    identity.verifiedAt = new Date();
    // @ts-expect-error disabledAt is not assignable from outside the entity
    identity.disabledAt = new Date();

    expect(identity.isVerified()).toBe(false);
    expect(identity.isDisabled()).toBe(false);
  });

  it('verifies once and refuses a second verify', (): void => {
    const identity = buildPasswordIdentity();

    identity.verify();

    expect(identity.isVerified()).toBe(true);
    expect(identity.toPrimitives().verifiedAt).toBeInstanceOf(Date);
    expect((): void => identity.verify()).toThrow(Conflict);
    expect((): void => identity.verify()).toThrow('Conflict: Identity is already verified.');
  });
});
