import {TokenSigningConfig} from '@account/domain/TokenSigningConfig.js';

export class TokenSigningConfigFake implements TokenSigningConfig {
  public constructor (private readonly signingSecret: string = 'test-signing-secret-of-at-least-32-characters') {}

  public getSigningSecret (): string {
    return this.signingSecret;
  }
}
