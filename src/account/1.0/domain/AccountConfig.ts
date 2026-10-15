import {PasswordCompositionRules} from '@account/domain/valueObject/PasswordCompositionRules.js';

export interface AccountConfig {
  getPasswordCompositionRules (): PasswordCompositionRules;
  getVerificationCodeLength (): number;
}

export const ACCOUNT_CONFIG = Symbol.for('AccountConfig');
