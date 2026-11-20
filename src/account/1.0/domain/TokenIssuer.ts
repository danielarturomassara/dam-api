import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface IssuedToken {
  expiresInSeconds: number;
  token: string;
}

export interface TokenIssuer {
  issueAccessToken (accountId: Uuid): Promise<IssuedToken>;
  issueRefreshToken (accountId: Uuid, provider: IDENTITY_PROVIDERS): Promise<IssuedToken>;
}

export const TOKEN_ISSUER = Symbol.for('TokenIssuer');
