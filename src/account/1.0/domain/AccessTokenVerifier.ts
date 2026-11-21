import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface AccessTokenClaims {
  accountId: Uuid;
  expiresAt: Date;
  issuedAt: Date;
  tokenId: Uuid;
}

export interface AccessTokenVerifier {
  verify (token: string): Promise<AccessTokenClaims>;
}

export const ACCESS_TOKEN_VERIFIER = Symbol.for('AccessTokenVerifier');
