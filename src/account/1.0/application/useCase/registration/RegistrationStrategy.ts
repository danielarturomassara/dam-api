import {Account} from '@account/domain/entity/Account.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

export interface RegistrationStrategy {
  register (rawProviderData: unknown): Promise<Account>;
}

export type RegistrationStrategyRegistry = Record<IDENTITY_PROVIDERS, RegistrationStrategy>;

export const REGISTRATION_STRATEGY_REGISTRY = Symbol.for('RegistrationStrategyRegistry');
