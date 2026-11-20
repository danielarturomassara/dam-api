export interface TokenSigningConfig {
  getSigningSecret (): string;
}

export const TOKEN_SIGNING_CONFIG = Symbol.for('TokenSigningConfig');
