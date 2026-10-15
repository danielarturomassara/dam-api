import {AccountConfig} from '@account/domain/AccountConfig.js';
import {PasswordCompositionRules, PasswordCompositionRulesPrimitives} from '@account/domain/valueObject/PasswordCompositionRules.js';

export class AccountConfigFake implements AccountConfig {
  private readonly passwordCompositionRules: PasswordCompositionRules;

  public constructor (
    compositionRules: Partial<PasswordCompositionRulesPrimitives> = {},
    private readonly verificationCodeLength: number = 6
  ) {
    this.passwordCompositionRules = PasswordCompositionRules.fromPrimitives({
      minimumDigitCount: compositionRules.minimumDigitCount ?? 0,
      minimumLowercaseCount: compositionRules.minimumLowercaseCount ?? 0,
      minimumSymbolCount: compositionRules.minimumSymbolCount ?? 0,
      minimumUppercaseCount: compositionRules.minimumUppercaseCount ?? 0
    });
  }

  public getPasswordCompositionRules (): PasswordCompositionRules {
    return this.passwordCompositionRules;
  }

  public getVerificationCodeLength (): number {
    return this.verificationCodeLength;
  }
}
