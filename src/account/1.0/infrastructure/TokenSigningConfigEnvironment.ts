import {TokenSigningConfig} from '@account/domain/TokenSigningConfig.js';
import {ENVIRONMENT_READER, EnvironmentReader} from '@core/domain/EnvironmentReader.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import {inject, injectable} from 'inversify';

const MINIMUM_SECRET_LENGTH = 32;

@injectable()
export class TokenSigningConfigEnvironment implements TokenSigningConfig {
  private readonly signingSecret: string;

  public constructor (@inject(ENVIRONMENT_READER) environmentReader: EnvironmentReader) {
    this.signingSecret = environmentReader.getRequiredString('ACCOUNT_JWT_SECRET');

    if (this.signingSecret.length < MINIMUM_SECRET_LENGTH) {
      throw new ServerError(`Environment variable ACCOUNT_JWT_SECRET must be at least ${MINIMUM_SECRET_LENGTH} characters long.`);
    }
  }

  public getSigningSecret (): string {
    return this.signingSecret;
  }
}
