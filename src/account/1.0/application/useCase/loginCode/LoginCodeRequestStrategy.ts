import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

export interface LoginCodeRequestStrategy {
  request (rawProviderData: unknown): Promise<void>;
}

export type LoginCodeRequestStrategyRegistry = Partial<Record<IDENTITY_PROVIDERS, LoginCodeRequestStrategy>>;

export const LOGIN_CODE_REQUEST_STRATEGY_REGISTRY = Symbol.for('LoginCodeRequestStrategyRegistry');
