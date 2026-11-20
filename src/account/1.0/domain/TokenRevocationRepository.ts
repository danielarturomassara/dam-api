import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface RevocableToken {
  accountId: Uuid;
  issuedAt: Date;
  tokenId: Uuid;
}

export interface TokenRevocationRepository {
  isRevoked (revocableToken: RevocableToken): Promise<boolean>;
  revokeToken (tokenId: Uuid, expiresAt: Date): Promise<void>;
  revokeTokensOfAccount (accountId: Uuid, issuedUntil: Date, expiresAt: Date): Promise<void>;
}

export const TOKEN_REVOCATION_REPOSITORY = Symbol.for('TokenRevocationRepository');
