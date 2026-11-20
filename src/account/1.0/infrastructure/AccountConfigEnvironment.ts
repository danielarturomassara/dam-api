import {AccountConfig} from '@account/domain/AccountConfig.js';
import {LoginChallengePolicy} from '@account/domain/valueObject/LoginChallengePolicy.js';
import {PasswordCompositionRules} from '@account/domain/valueObject/PasswordCompositionRules.js';
import {ENVIRONMENT_READER, EnvironmentReader} from '@core/domain/EnvironmentReader.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';
import {inject, injectable} from 'inversify';

const DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS = 900;

const MINIMUM_ACCESS_TOKEN_LIFETIME_SECONDS = 60;

const DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS = 2_592_000;

const DEFAULT_LOGIN_CODE_LIFETIME_SECONDS = 300;

const MINIMUM_LOGIN_CODE_LIFETIME_SECONDS = 30;

const DEFAULT_LOGIN_CODE_MAXIMUM_ATTEMPTS = 5;

const DEFAULT_LOGIN_CODE_RESEND_INTERVAL_SECONDS = 60;

const DEFAULT_THROTTLE_MAXIMUM_REQUESTS = 20;

const DEFAULT_THROTTLE_WINDOW_SECONDS = 300;

const DEFAULT_VERIFICATION_CODE_LENGTH = 6;

@injectable()
export class AccountConfigEnvironment implements AccountConfig {
  private readonly accessTokenLifetimeSeconds: number;
  private readonly loginChallengePolicy: LoginChallengePolicy;
  private readonly passwordCompositionRules: PasswordCompositionRules;
  private readonly refreshTokenLifetimeSeconds: number;
  private readonly throttlePolicy: ThrottlePolicy;
  private readonly verificationCodeLength: number;

  public constructor (@inject(ENVIRONMENT_READER) environmentReader: EnvironmentReader) {
    this.passwordCompositionRules = PasswordCompositionRules.fromPrimitives({
      minimumDigitCount: this.readMinimumCount(environmentReader, 'ACCOUNT_PASSWORD_MINIMUM_DIGITS'),
      minimumLowercaseCount: this.readMinimumCount(environmentReader, 'ACCOUNT_PASSWORD_MINIMUM_LOWERCASE'),
      minimumSymbolCount: this.readMinimumCount(environmentReader, 'ACCOUNT_PASSWORD_MINIMUM_SYMBOLS'),
      minimumUppercaseCount: this.readMinimumCount(environmentReader, 'ACCOUNT_PASSWORD_MINIMUM_UPPERCASE')
    });
    this.throttlePolicy = ThrottlePolicy.fromPrimitives({
      maximumRequests: this.readAtLeast(environmentReader, 'ACCOUNT_THROTTLE_MAXIMUM_REQUESTS', DEFAULT_THROTTLE_MAXIMUM_REQUESTS, 1),
      windowSeconds: this.readAtLeast(environmentReader, 'ACCOUNT_THROTTLE_WINDOW_SECONDS', DEFAULT_THROTTLE_WINDOW_SECONDS, 1)
    });
    this.verificationCodeLength = this.readAtLeast(environmentReader, 'ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH', DEFAULT_VERIFICATION_CODE_LENGTH, 1);
    this.accessTokenLifetimeSeconds = this.readAtLeast(environmentReader, 'ACCOUNT_ACCESS_TOKEN_LIFETIME_SECONDS', DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS, MINIMUM_ACCESS_TOKEN_LIFETIME_SECONDS);
    this.refreshTokenLifetimeSeconds = this.readRefreshTokenLifetime(environmentReader);
    this.loginChallengePolicy = this.readLoginChallengePolicy(environmentReader);
  }

  public getAccessTokenLifetimeSeconds (): number {
    return this.accessTokenLifetimeSeconds;
  }

  public getLoginChallengePolicy (): LoginChallengePolicy {
    return this.loginChallengePolicy;
  }

  public getPasswordCompositionRules (): PasswordCompositionRules {
    return this.passwordCompositionRules;
  }

  public getRefreshTokenLifetimeSeconds (): number {
    return this.refreshTokenLifetimeSeconds;
  }

  public getThrottlePolicy (): ThrottlePolicy {
    return this.throttlePolicy;
  }

  public getVerificationCodeLength (): number {
    return this.verificationCodeLength;
  }

  private readAtLeast (environmentReader: EnvironmentReader, variableName: string, defaultValue: number, minimum: number): number {
    const value = environmentReader.getOptionalNumber(variableName, defaultValue);

    if (value < minimum) {
      throw new ServerError(`Environment variable ${variableName} must be at least ${minimum}.`);
    }

    return value;
  }

  private readLoginChallengePolicy (environmentReader: EnvironmentReader): LoginChallengePolicy {
    const lifetimeSeconds = this.readAtLeast(environmentReader, 'ACCOUNT_LOGIN_CODE_LIFETIME_SECONDS', DEFAULT_LOGIN_CODE_LIFETIME_SECONDS, MINIMUM_LOGIN_CODE_LIFETIME_SECONDS);
    const maximumAttempts = this.readAtLeast(environmentReader, 'ACCOUNT_LOGIN_CODE_MAXIMUM_ATTEMPTS', DEFAULT_LOGIN_CODE_MAXIMUM_ATTEMPTS, 1);
    const resendIntervalSeconds = this.readAtLeast(environmentReader, 'ACCOUNT_LOGIN_CODE_RESEND_INTERVAL_SECONDS', DEFAULT_LOGIN_CODE_RESEND_INTERVAL_SECONDS, 0);

    if (resendIntervalSeconds > lifetimeSeconds) {
      throw new ServerError('Environment variable ACCOUNT_LOGIN_CODE_RESEND_INTERVAL_SECONDS must be at most ACCOUNT_LOGIN_CODE_LIFETIME_SECONDS.');
    }

    return LoginChallengePolicy.fromPrimitives({lifetimeSeconds, maximumAttempts, resendIntervalSeconds});
  }

  private readMinimumCount (environmentReader: EnvironmentReader, variableName: string): number {
    const minimumCount = environmentReader.getOptionalNumber(variableName, 0);

    if (minimumCount < 0) {
      throw new ServerError(`Environment variable ${variableName} must be zero or greater.`);
    }

    return minimumCount;
  }

  private readRefreshTokenLifetime (environmentReader: EnvironmentReader): number {
    const refreshTokenLifetimeSeconds = environmentReader.getOptionalNumber('ACCOUNT_REFRESH_TOKEN_LIFETIME_SECONDS', DEFAULT_REFRESH_TOKEN_LIFETIME_SECONDS);

    if (refreshTokenLifetimeSeconds <= this.accessTokenLifetimeSeconds) {
      throw new ServerError('Environment variable ACCOUNT_REFRESH_TOKEN_LIFETIME_SECONDS must be greater than ACCOUNT_ACCESS_TOKEN_LIFETIME_SECONDS.');
    }

    return refreshTokenLifetimeSeconds;
  }
}
