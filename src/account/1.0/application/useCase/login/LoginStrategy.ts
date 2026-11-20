import {Account} from '@account/domain/entity/Account.js';
import {Identity} from '@account/domain/entity/Identity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

export interface AuthenticatedIdentity {
  account: Account;
  identity: Identity;
}

export interface LoginStrategy {
  authenticate (rawProviderData: unknown): Promise<AuthenticatedIdentity>;
}

export type LoginStrategyRegistry = Record<IDENTITY_PROVIDERS, LoginStrategy>;

export const LOGIN_STRATEGY_REGISTRY = Symbol.for('LoginStrategyRegistry');
