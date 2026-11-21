import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface AccessTokenAuthenticator {
  authenticate (accessToken: string): Promise<Authentication>;
}

export interface Authentication {
  expiresAt: Date;
  issuedAt: Date;
  subjectId: Uuid;
  tokenId: Uuid;
}

export const ACCESS_TOKEN_AUTHENTICATOR = Symbol.for('AccessTokenAuthenticator');
