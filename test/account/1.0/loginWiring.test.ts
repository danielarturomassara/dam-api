import {Login} from '@account/application/useCase/Login.js';
import {AppleLogin} from '@account/application/useCase/login/AppleLogin.js';
import {GoogleLogin} from '@account/application/useCase/login/GoogleLogin.js';
import {LOGIN_STRATEGY_REGISTRY, LoginStrategyRegistry} from '@account/application/useCase/login/LoginStrategy.js';
import {MetaLogin} from '@account/application/useCase/login/MetaLogin.js';
import {PasswordLogin} from '@account/application/useCase/login/PasswordLogin.js';
import {PhoneLogin} from '@account/application/useCase/login/PhoneLogin.js';
import {LoginCodeRequestNotAvailable} from '@account/application/useCase/loginCode/LoginCodeRequestNotAvailable.js';
import {LOGIN_CODE_REQUEST_STRATEGY_REGISTRY, LoginCodeRequestStrategyRegistry} from '@account/application/useCase/loginCode/LoginCodeRequestStrategy.js';
import {RefreshAccessToken} from '@account/application/useCase/RefreshAccessToken.js';
import {RequestLoginCode} from '@account/application/useCase/RequestLoginCode.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {LOGIN_CHALLENGE_REPOSITORY} from '@account/domain/LoginChallengeRepository.js';
import {REFRESH_TOKEN_VERIFIER} from '@account/domain/RefreshTokenVerifier.js';
import {TOKEN_ISSUER} from '@account/domain/TokenIssuer.js';
import {TOKEN_SIGNING_CONFIG} from '@account/domain/TokenSigningConfig.js';
import {RefreshTokenVerifierJsonWebToken} from '@account/infrastructure/jsonwebtoken/RefreshTokenVerifierJsonWebToken.js';
import {TokenIssuerJsonWebToken} from '@account/infrastructure/jsonwebtoken/TokenIssuerJsonWebToken.js';
import {LoginChallengeRepositoryMongo} from '@account/infrastructure/mongodb/LoginChallengeRepositoryMongo.js';
import {TokenSigningConfigEnvironment} from '@account/infrastructure/TokenSigningConfigEnvironment.js';
import {STARTUP_CONFIG_VALIDATION} from '@core/domain/StartupConfigValidation.js';
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

describe('account login wiring', (): void => {
  it.each<[string, symbol, new (...constructorArguments: Array<never>) => unknown]>([
    ['TOKEN_ISSUER', TOKEN_ISSUER, TokenIssuerJsonWebToken],
    ['REFRESH_TOKEN_VERIFIER', REFRESH_TOKEN_VERIFIER, RefreshTokenVerifierJsonWebToken],
    ['TOKEN_SIGNING_CONFIG', TOKEN_SIGNING_CONFIG, TokenSigningConfigEnvironment],
    ['LOGIN_CHALLENGE_REPOSITORY', LOGIN_CHALLENGE_REPOSITORY, LoginChallengeRepositoryMongo]
  ])('binds %s to its adapter as a singleton', (_tokenName: string, token: symbol, expectedClass: new (...constructorArguments: Array<never>) => unknown): void => {
    expect(dependencyContainer.get(token)).toBeInstanceOf(expectedClass);
    expect(dependencyContainer.get(token)).toBe(dependencyContainer.get(token));
  });

  it.each([
    [IDENTITY_PROVIDERS.APPLE, AppleLogin],
    [IDENTITY_PROVIDERS.GOOGLE, GoogleLogin],
    [IDENTITY_PROVIDERS.META, MetaLogin],
    [IDENTITY_PROVIDERS.PASSWORD, PasswordLogin],
    [IDENTITY_PROVIDERS.PHONE, PhoneLogin]
  ])('maps the %s provider to its login strategy', (provider: IDENTITY_PROVIDERS, expectedClass: new (...constructorArguments: Array<never>) => unknown): void => {
    expect(dependencyContainer.get<LoginStrategyRegistry>(LOGIN_STRATEGY_REGISTRY)[provider]).toBeInstanceOf(expectedClass);
  });

  it('wires only the phone provider for login codes, to the strategy that answers while delivery is not available', (): void => {
    const registry = dependencyContainer.get<LoginCodeRequestStrategyRegistry>(LOGIN_CODE_REQUEST_STRATEGY_REGISTRY);

    expect(Object.keys(registry)).toStrictEqual([IDENTITY_PROVIDERS.PHONE]);
    expect(registry[IDENTITY_PROVIDERS.PHONE]).toBeInstanceOf(LoginCodeRequestNotAvailable);
  });

  it.each([['Login', Login], ['RequestLoginCode', RequestLoginCode], ['RefreshAccessToken', RefreshAccessToken]])('resolves the %s use case', (_useCaseName: string, useCaseClass: new (...constructorArguments: Array<never>) => unknown): void => {
    expect(dependencyContainer.get(useCaseClass)).toBeInstanceOf(useCaseClass);
  });

  it('validates the signing secret at startup', (): void => {
    const startupValidatedConfigList = dependencyContainer.getAll<unknown>(STARTUP_CONFIG_VALIDATION);

    expect(startupValidatedConfigList.some((config) => config instanceof TokenSigningConfigEnvironment)).toBe(true);
  });
});
