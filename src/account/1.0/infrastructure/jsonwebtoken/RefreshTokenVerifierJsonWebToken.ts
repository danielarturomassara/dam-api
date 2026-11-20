import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {RefreshTokenClaims, RefreshTokenVerifier} from '@account/domain/RefreshTokenVerifier.js';
import {TOKEN_SIGNING_CONFIG, TokenSigningConfig} from '@account/domain/TokenSigningConfig.js';
import {CORE_CONFIG, CoreConfig} from '@core/domain/CoreConfig.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {inject, injectable} from 'inversify';
import jsonwebtoken from 'jsonwebtoken';

@injectable()
export class RefreshTokenVerifierJsonWebToken implements RefreshTokenVerifier {
  public constructor (
    @inject(TOKEN_SIGNING_CONFIG) private readonly tokenSigningConfig: TokenSigningConfig,
    @inject(CORE_CONFIG) private readonly coreConfig: CoreConfig
  ) {}

  public async verify (token: string): Promise<RefreshTokenClaims> {
    const payload = this.verifySignedPayload(token);
    const provider = Object.values(IDENTITY_PROVIDERS).find((identityProvider) => identityProvider === payload.provider);

    if (payload.token_use !== 'refresh' || typeof payload.exp !== 'number' || provider === undefined) {
      throw new Unauthorized('Invalid refresh token');
    }

    return {accountId: this.toAccountId(payload.sub), provider};
  }

  private toAccountId (subject: unknown): Uuid {
    try {
      return Uuid.fromPrimitives(String(subject));
    } catch (error) {
      if (error instanceof InvalidArgument) {
        throw new Unauthorized('Invalid refresh token');
      }

      throw error;
    }
  }

  private verifySignedPayload (token: string): jsonwebtoken.JwtPayload {
    try {
      const payload = jsonwebtoken.verify(token, this.tokenSigningConfig.getSigningSecret(), {algorithms: ['HS256'], issuer: this.coreConfig.getApiName()});

      if (typeof payload === 'string') {
        throw new Unauthorized('Invalid refresh token');
      }

      return payload;
    } catch (error) {
      if (error instanceof jsonwebtoken.JsonWebTokenError) {
        throw new Unauthorized('Invalid refresh token');
      }

      throw error;
    }
  }
}
