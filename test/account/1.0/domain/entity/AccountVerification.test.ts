import {LoginNotAllowed} from '@account/domain/error/LoginNotAllowed.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {describe, expect, it} from 'vitest';

import {buildGoogleOnlyAccount, buildPasswordLoginAccount, buildPhoneLoginAccount, LoginAccountState} from '../../double/loginFixtures.js';

const PHONE = '+34600111222';

describe('Account verification by a proven login credential', (): void => {
  it('verifies an unverified identity whose mode is BY_LOGIN and reports the change', (): void => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});
    const identity = account.getIdentities()[0]!;

    expect(account.recordProvenCredential(identity)).toBe(true);
    expect(identity.isVerified()).toBe(true);
    expect(account.toPrimitives().identities[0]?.verifiedAt).toBeInstanceOf(Date);
  });

  it('reports no change for an identity that is already verified', (): void => {
    const account = buildPhoneLoginAccount(PHONE);
    const identity = account.getIdentities()[0]!;
    const verifiedAt = identity.toPrimitives().verifiedAt;

    expect(account.recordProvenCredential(identity)).toBe(false);
    expect(identity.toPrimitives().verifiedAt).toStrictEqual(verifiedAt);
  });

  it('never verifies an identity of another mode: a proven password leaves its identity unverified', (): void => {
    const account = buildPasswordLoginAccount('someone@example.com', {isIdentityVerified: false});
    const identity = account.getIdentities()[0]!;

    expect(account.recordProvenCredential(identity)).toBe(false);
    expect(identity.isVerified()).toBe(false);
  });

  it('reports no change for an identity verified on creation', (): void => {
    const account = buildGoogleOnlyAccount('someone@example.com');

    expect(account.recordProvenCredential(account.getIdentities()[0]!)).toBe(false);
  });

  it.each<[string, LoginAccountState]>([
    ['the account is disabled', {isAccountDisabled: true, isIdentityVerified: false}],
    ['the identity is disabled', {isIdentityDisabled: true, isIdentityVerified: false}]
  ])('verifies whether or not %s', (_caseName: string, state: LoginAccountState): void => {
    const account = buildPhoneLoginAccount(PHONE, state);
    const identity = account.getIdentities()[0]!;

    expect(account.recordProvenCredential(identity)).toBe(true);
    expect(identity.isVerified()).toBe(true);
  });

  it('fails loudly for an identity the account does not hold', (): void => {
    const account = buildPhoneLoginAccount(PHONE, {isIdentityVerified: false});
    const foreignIdentity = buildPhoneLoginAccount('+34600111333', {isIdentityVerified: false}).getIdentities()[0]!;

    expect((): boolean => account.recordProvenCredential(foreignIdentity)).toThrow(ServerError);
    expect(foreignIdentity.isVerified()).toBe(false);
  });
});

describe('Account that may be sent a login code', (): void => {
  it.each<[string, LoginAccountState]>([
    ['a verified identity', {}],
    ['an unverified identity whose mode is BY_LOGIN', {isIdentityVerified: false}]
  ])('lets an enabled account be challenged with %s', (_caseName: string, state: LoginAccountState): void => {
    const account = buildPhoneLoginAccount(PHONE, state);

    expect((): void => account.ensureCanBeChallengedWith(account.getIdentities()[0]!)).not.toThrow();
  });

  it.each<[string, LoginAccountState, string]>([
    ['a disabled account', {isAccountDisabled: true}, 'account disabled'],
    ['a disabled identity', {isIdentityDisabled: true}, 'identity disabled'],
    ['a disabled account before a disabled identity', {isAccountDisabled: true, isIdentityDisabled: true, isIdentityVerified: false}, 'account disabled'],
    ['a disabled, unverified identity', {isIdentityDisabled: true, isIdentityVerified: false}, 'identity disabled']
  ])('refuses %s', (_caseName: string, state: LoginAccountState, expectedReason: string): void => {
    const account = buildPhoneLoginAccount(PHONE, state);

    expect((): void => account.ensureCanBeChallengedWith(account.getIdentities()[0]!)).toThrow(new LoginNotAllowed(expectedReason as LoginNotAllowed['reason']));
  });

  it('refuses an unverified identity whose mode is not BY_LOGIN', (): void => {
    const account = buildPasswordLoginAccount('someone@example.com', {isIdentityVerified: false});

    expect((): void => account.ensureCanBeChallengedWith(account.getIdentities()[0]!)).toThrow(new LoginNotAllowed('identity not verified'));
  });

  it('checks a disabled identity before an unverified one of another mode', (): void => {
    const account = buildPasswordLoginAccount('someone@example.com', {isIdentityDisabled: true, isIdentityVerified: false});

    expect((): void => account.ensureCanBeChallengedWith(account.getIdentities()[0]!)).toThrow(new LoginNotAllowed('identity disabled'));
  });
});
