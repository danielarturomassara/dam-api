import {LoginChallengePolicy} from '@account/domain/valueObject/LoginChallengePolicy.js';
import {PasswordCompositionRules} from '@account/domain/valueObject/PasswordCompositionRules.js';
import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';

export interface AccountConfig {
  getAccessTokenLifetimeSeconds (): number;
  getLoginChallengePolicy (): LoginChallengePolicy;
  getPasswordCompositionRules (): PasswordCompositionRules;
  getRefreshTokenLifetimeSeconds (): number;
  getThrottlePolicy (): ThrottlePolicy;
  getVerificationCodeLength (): number;
}

export const ACCOUNT_CONFIG = Symbol.for('AccountConfig');
