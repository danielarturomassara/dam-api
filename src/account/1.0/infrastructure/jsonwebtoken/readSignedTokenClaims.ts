import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import jsonwebtoken from 'jsonwebtoken';

export interface SignedTokenClaims {
  accountId: Uuid;
  expiresAt: Date;
  issuedAt: Date;
  payload: jsonwebtoken.JwtPayload;
  tokenId: Uuid;
}

export interface SignedTokenExpectation {
  issuer: string;
  signingSecret: string;
  tokenUse: string;
}

const MILLISECONDS_PER_SECOND = 1000;

const verifySignedPayload = (token: string, expectation: SignedTokenExpectation): Nullable<jsonwebtoken.JwtPayload> => {
  try {
    const payload = jsonwebtoken.verify(token, expectation.signingSecret, {algorithms: ['HS256'], issuer: expectation.issuer});

    return typeof payload === 'string' ? null : payload;
  } catch (error) {
    if (error instanceof jsonwebtoken.JsonWebTokenError || error instanceof SyntaxError) {
      return null;
    }

    throw error;
  }
};

const toUuid = (claim: unknown): Nullable<Uuid> => {
  if (typeof claim !== 'string') {
    return null;
  }

  try {
    return Uuid.fromPrimitives(claim);
  } catch (error) {
    if (error instanceof InvalidArgument) {
      return null;
    }

    throw error;
  }
};

const toDate = (secondsClaim: unknown): Nullable<Date> => {
  return typeof secondsClaim === 'number' ? new Date(secondsClaim * MILLISECONDS_PER_SECOND) : null;
};

export const readSignedTokenClaims = (token: string, expectation: SignedTokenExpectation): Nullable<SignedTokenClaims> => {
  const payload = verifySignedPayload(token, expectation);

  if (payload?.token_use !== expectation.tokenUse) {
    return null;
  }

  const accountId = toUuid(payload.sub);
  const tokenId = toUuid(payload.jti);
  const issuedAt = toDate(payload.iat);
  const expiresAt = toDate(payload.exp);

  if (!accountId || !tokenId || !issuedAt || !expiresAt) {
    return null;
  }

  return {accountId, expiresAt, issuedAt, payload, tokenId};
};
