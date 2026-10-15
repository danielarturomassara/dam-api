import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

export interface PasswordCompositionRulesPrimitives {
  minimumDigitCount: number;
  minimumLowercaseCount: number;
  minimumSymbolCount: number;
  minimumUppercaseCount: number;
}

interface CompositionRequirement {
  characterDescription: string;
  characterRegExp: RegExp;
  minimumCount: number;
}

export class PasswordCompositionRules {
  private readonly minimumDigitCount: number;
  private readonly minimumLowercaseCount: number;
  private readonly minimumSymbolCount: number;
  private readonly minimumUppercaseCount: number;

  public static fromPrimitives (primitives: PasswordCompositionRulesPrimitives): PasswordCompositionRules {
    return new PasswordCompositionRules(primitives);
  }

  public ensureSatisfiedBy (password: string): void {
    for (const requirement of this.getRequirementList()) {
      this.ensureRequirementIsSatisfied(password, requirement);
    }
  }

  public toPrimitives (): PasswordCompositionRulesPrimitives {
    return {
      minimumDigitCount: this.minimumDigitCount,
      minimumLowercaseCount: this.minimumLowercaseCount,
      minimumSymbolCount: this.minimumSymbolCount,
      minimumUppercaseCount: this.minimumUppercaseCount
    };
  }

  private constructor (primitives: PasswordCompositionRulesPrimitives) {
    this.minimumDigitCount = primitives.minimumDigitCount;
    this.minimumLowercaseCount = primitives.minimumLowercaseCount;
    this.minimumSymbolCount = primitives.minimumSymbolCount;
    this.minimumUppercaseCount = primitives.minimumUppercaseCount;

    this.ensureCountsAreNonNegativeIntegers();
  }

  private ensureCountsAreNonNegativeIntegers (): void {
    for (const [countName, countValue] of Object.entries(this.toPrimitives())) {
      if (!Number.isInteger(countValue) || countValue < 0) {
        throw new InvalidArgument({customMessage: `${countName} must be a non-negative integer`});
      }
    }
  }

  private ensureRequirementIsSatisfied (password: string, requirement: CompositionRequirement): void {
    const matchCount = password.match(requirement.characterRegExp)?.length ?? 0;

    if (matchCount < requirement.minimumCount) {
      throw new InvalidArgument({customMessage: `Password must contain at least ${requirement.minimumCount} ${requirement.characterDescription}`});
    }
  }

  private getRequirementList (): Array<CompositionRequirement> {
    return [
      {characterDescription: 'digits', characterRegExp: /\d/gu, minimumCount: this.minimumDigitCount},
      {characterDescription: 'lowercase letters', characterRegExp: /\p{Ll}/gu, minimumCount: this.minimumLowercaseCount},
      {characterDescription: 'symbols', characterRegExp: /[^\p{L}\p{N}]/gu, minimumCount: this.minimumSymbolCount},
      {characterDescription: 'uppercase letters', characterRegExp: /\p{Lu}/gu, minimumCount: this.minimumUppercaseCount}
    ];
  }
}
