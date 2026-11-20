import {Account} from '@account/domain/entity/Account.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

export interface VerificationStrategy {
  verify (rawProviderData: unknown): Promise<Account>;
}

export type VerificationStrategyRegistry = Partial<Record<IDENTITY_PROVIDERS, VerificationStrategy>>;

export const VERIFICATION_STRATEGY_REGISTRY = Symbol.for('VerificationStrategyRegistry');
