import {AuthenticateAccessToken} from '@account/application/useCase/AuthenticateAccessToken.js';
import {Logout} from '@account/application/useCase/Logout.js';
import {LogoutEverywhere} from '@account/application/useCase/LogoutEverywhere.js';
import {RefreshAccessToken} from '@account/application/useCase/RefreshAccessToken.js';
import {ACCESS_TOKEN_VERIFIER} from '@account/domain/AccessTokenVerifier.js';
import {TOKEN_REVOCATION_REPOSITORY} from '@account/domain/TokenRevocationRepository.js';
import {AccessTokenAuthenticatorInProcess} from '@account/infrastructure/AccessTokenAuthenticatorInProcess.js';
import {AccessTokenVerifierJsonWebToken} from '@account/infrastructure/jsonwebtoken/AccessTokenVerifierJsonWebToken.js';
import {TokenRevocationRepositoryMongo} from '@account/infrastructure/mongodb/TokenRevocationRepositoryMongo.js';
import {ACCESS_TOKEN_AUTHENTICATOR} from '@core/domain/AccessTokenAuthenticator.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {beforeAll, describe, expect, it} from 'vitest';

beforeAll((): void => {
  process.env.ACCOUNT_JWT_SECRET = 'wiring-test-secret-of-at-least-32-characters';
  process.env.API_NAME = 'api-test';
  process.env.API_PORT = '3000';
  process.env.LOG_LEVEL = 'error';
  process.env.MONGODB_DATABASE = 'wiring-test';
  process.env.MONGODB_HOST = 'localhost';
  process.env.MONGODB_PORT = '27017';
  process.env.NODE_ENV = 'test';
});

describe('account logout wiring', (): void => {
  it.each<[string, symbol, new (...constructorArguments: Array<never>) => unknown]>([
    ['ACCESS_TOKEN_VERIFIER', ACCESS_TOKEN_VERIFIER, AccessTokenVerifierJsonWebToken],
    ['TOKEN_REVOCATION_REPOSITORY', TOKEN_REVOCATION_REPOSITORY, TokenRevocationRepositoryMongo],
    ['the core ACCESS_TOKEN_AUTHENTICATOR', ACCESS_TOKEN_AUTHENTICATOR, AccessTokenAuthenticatorInProcess]
  ])('binds %s to its adapter as a singleton', (_tokenName: string, token: symbol, expectedClass: new (...constructorArguments: Array<never>) => unknown): void => {
    expect(dependencyContainer.get(token)).toBeInstanceOf(expectedClass);
    expect(dependencyContainer.get(token)).toBe(dependencyContainer.get(token));
  });

  it.each([
    ['AuthenticateAccessToken', AuthenticateAccessToken],
    ['Logout', Logout],
    ['LogoutEverywhere', LogoutEverywhere],
    ['RefreshAccessToken', RefreshAccessToken]
  ])('resolves the %s use case', (_useCaseName: string, useCaseClass: new (...constructorArguments: Array<never>) => unknown): void => {
    expect(dependencyContainer.get(useCaseClass)).toBeInstanceOf(useCaseClass);
  });
});
