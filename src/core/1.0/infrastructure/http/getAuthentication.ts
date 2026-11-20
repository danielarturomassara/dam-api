import {Authentication} from '@core/domain/AccessTokenAuthenticator.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {Response} from 'express';

const isAuthentication = (candidate: unknown): candidate is Authentication => {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  const hasTokenValidity = Reflect.get(candidate, 'expiresAt') instanceof Date && Reflect.get(candidate, 'issuedAt') instanceof Date;
  const hasIdentifiers = Reflect.get(candidate, 'subjectId') instanceof Uuid && Reflect.get(candidate, 'tokenId') instanceof Uuid;

  return hasTokenValidity && hasIdentifiers;
};

export const getAuthentication = (response: Response): Authentication => {
  const authentication: unknown = response.locals.authentication;

  if (!isAuthentication(authentication)) {
    throw new ServerError('The request was not authenticated.');
  }

  return authentication;
};
