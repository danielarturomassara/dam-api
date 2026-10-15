import {AccountConfig} from '@account/domain/AccountConfig.js';
import {PasswordCompositionRules} from '@account/domain/valueObject/PasswordCompositionRules.js';
import {ENVIRONMENT_READER, EnvironmentReader} from '@core/domain/EnvironmentReader.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {inject, injectable} from 'inversify';

const DEFAULT_VERIFICATION_CODE_LENGTH = 6;

@injectable()
export class AccountConfigEnvironment implements AccountConfig {
  private readonly passwordCompositionRules: PasswordCompositionRules;
  private readonly verificationCodeLength: number;

  public constructor (@inject(ENVIRONMENT_READER) environmentReader: EnvironmentReader) {
    this.passwordCompositionRules = PasswordCompositionRules.fromPrimitives({
      minimumDigitCount: this.readMinimumCount(environmentReader, 'ACCOUNT_PASSWORD_MINIMUM_DIGITS'),
      minimumLowercaseCount: this.readMinimumCount(environmentReader, 'ACCOUNT_PASSWORD_MINIMUM_LOWERCASE'),
      minimumSymbolCount: this.readMinimumCount(environmentReader, 'ACCOUNT_PASSWORD_MINIMUM_SYMBOLS'),
      minimumUppercaseCount: this.readMinimumCount(environmentReader, 'ACCOUNT_PASSWORD_MINIMUM_UPPERCASE')
    });
    this.verificationCodeLength = this.readVerificationCodeLength(environmentReader);
  }

  public getPasswordCompositionRules (): PasswordCompositionRules {
    return this.passwordCompositionRules;
  }

  public getVerificationCodeLength (): number {
    return this.verificationCodeLength;
  }

  private readMinimumCount (environmentReader: EnvironmentReader, variableName: string): number {
    const minimumCount = environmentReader.getOptionalNumber(variableName, 0);

    if (minimumCount < 0) {
      throw new ServerError(`Environment variable ${variableName} must be zero or greater.`);
    }

    return minimumCount;
  }

  private readVerificationCodeLength (environmentReader: EnvironmentReader): number {
    const codeLength = environmentReader.getOptionalNumber('ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH', DEFAULT_VERIFICATION_CODE_LENGTH);

    if (codeLength < 1) {
      throw new ServerError('Environment variable ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH must be at least 1.');
    }

    return codeLength;
  }
}
