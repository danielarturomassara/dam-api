import {LoginNotAllowed} from '@account/domain/error/LoginNotAllowed.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {describe, expect, it} from 'vitest';

import {buildPasswordAccountWithGoogleEmail, buildPasswordLoginAccount, buildPhoneLoginAccount, LoginAccountState} from '../../double/loginFixtures.js';

describe('Account login rules', (): void => {
  it('finds its identity of a provider, and answers null for a provider it does not hold', (): void => {
    const account = buildPasswordLoginAccount('someone@example.com');

    expect(account.getIdentity(IDENTITY_PROVIDERS.PASSWORD)?.provider).toBe(IDENTITY_PROVIDERS.PASSWORD);
    expect(account.getIdentity(IDENTITY_PROVIDERS.PHONE)).toBeNull();
  });

  it('matches only its primary email, not an email an oauth identity asserts', (): void => {
    const account = buildPasswordAccountWithGoogleEmail('primary@example.com', 'asserted@gmail.com');

    expect(account.matchesPrimaryEmail(Email.fromPrimitives('primary@example.com'))).toBe(true);
    expect(account.matchesPrimaryEmail(Email.fromPrimitives('asserted@gmail.com'))).toBe(false);
    expect(buildPhoneLoginAccount('+34600111222').matchesPrimaryEmail(Email.fromPrimitives('primary@example.com'))).toBe(false);
  });

  it('matches only its primary phone', (): void => {
    const account = buildPhoneLoginAccount('+34600111222');

    expect(account.matchesPrimaryPhone(Phone.fromPrimitives('+34600111222'))).toBe(true);
    expect(account.matchesPrimaryPhone(Phone.fromPrimitives('+34600111333'))).toBe(false);
    expect(buildPasswordLoginAccount('someone@example.com').matchesPrimaryPhone(Phone.fromPrimitives('+34600111222'))).toBe(false);
  });

  it('lets an enabled account log in with an enabled, verified identity', (): void => {
    const account = buildPasswordLoginAccount('someone@example.com');

    expect((): void => account.ensureCanAuthenticateWith(account.getIdentities()[0]!)).not.toThrow();
  });

  it.each<[string, LoginAccountState, string]>([
    ['a disabled account', {isAccountDisabled: true}, 'account disabled'],
    ['a disabled identity', {isIdentityDisabled: true}, 'identity disabled'],
    ['an unverified identity', {isIdentityVerified: false}, 'identity not verified'],
    ['a disabled account before a disabled identity', {isAccountDisabled: true, isIdentityDisabled: true, isIdentityVerified: false}, 'account disabled'],
    ['a disabled identity before an unverified one', {isIdentityDisabled: true, isIdentityVerified: false}, 'identity disabled']
  ])('refuses %s', (_caseName: string, state: LoginAccountState, expectedReason: string): void => {
    const account = buildPasswordLoginAccount('someone@example.com', state);

    expect((): void => account.ensureCanAuthenticateWith(account.getIdentities()[0]!)).toThrow(new LoginNotAllowed(expectedReason as LoginNotAllowed['reason']));
  });
});
