import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface RefreshTokenClaims {
  accountId: Uuid;
  provider: IDENTITY_PROVIDERS;
}

export interface RefreshTokenVerifier {
  verify (token: string): Promise<RefreshTokenClaims>;
}

export const REFRESH_TOKEN_VERIFIER = Symbol.for('RefreshTokenVerifier');
