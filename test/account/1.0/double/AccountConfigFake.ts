import {AccountConfig} from '@account/domain/AccountConfig.js';
import {LoginChallengePolicy, LoginChallengePolicyPrimitives} from '@account/domain/valueObject/LoginChallengePolicy.js';
import {PasswordCompositionRules, PasswordCompositionRulesPrimitives} from '@account/domain/valueObject/PasswordCompositionRules.js';
import {ThrottlePolicy, ThrottlePolicyPrimitives} from '@core/domain/valueObject/ThrottlePolicy.js';

export interface AccountConfigFakeLoginSettings {
  accessTokenLifetimeSeconds?: number;
  loginChallengePolicy?: LoginChallengePolicyPrimitives;
  refreshTokenLifetimeSeconds?: number;
}

const DEFAULT_COMPOSITION_RULES: PasswordCompositionRulesPrimitives = {minimumDigitCount: 0, minimumLowercaseCount: 0, minimumSymbolCount: 0, minimumUppercaseCount: 0};

const DEFAULT_LOGIN_SETTINGS: Required<AccountConfigFakeLoginSettings> = {
  accessTokenLifetimeSeconds: 900,
  loginChallengePolicy: {lifetimeSeconds: 300, maximumAttempts: 5, resendIntervalSeconds: 60},
  refreshTokenLifetimeSeconds: 2_592_000
};

export class AccountConfigFake implements AccountConfig {
  private readonly accessTokenLifetimeSeconds: number;
  private readonly loginChallengePolicy: LoginChallengePolicy;
  private readonly passwordCompositionRules: PasswordCompositionRules;
  private readonly refreshTokenLifetimeSeconds: number;
  private readonly throttlePolicy: ThrottlePolicy;

  public constructor (
    compositionRules: Partial<PasswordCompositionRulesPrimitives> = {},
    private readonly verificationCodeLength: number = 6,
    throttlePolicy: ThrottlePolicyPrimitives = {maximumRequests: 20, windowSeconds: 300},
    loginSettings: AccountConfigFakeLoginSettings = {}
  ) {
    const resolvedLoginSettings = {...DEFAULT_LOGIN_SETTINGS, ...loginSettings};

    this.accessTokenLifetimeSeconds = resolvedLoginSettings.accessTokenLifetimeSeconds;
    this.loginChallengePolicy = LoginChallengePolicy.fromPrimitives(resolvedLoginSettings.loginChallengePolicy);
    this.refreshTokenLifetimeSeconds = resolvedLoginSettings.refreshTokenLifetimeSeconds;
    this.throttlePolicy = ThrottlePolicy.fromPrimitives(throttlePolicy);
    this.passwordCompositionRules = PasswordCompositionRules.fromPrimitives({...DEFAULT_COMPOSITION_RULES, ...compositionRules});
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
}
