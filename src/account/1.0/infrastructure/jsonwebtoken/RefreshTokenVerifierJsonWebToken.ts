import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {RefreshTokenClaims, RefreshTokenVerifier} from '@account/domain/RefreshTokenVerifier.js';
import {TOKEN_SIGNING_CONFIG, TokenSigningConfig} from '@account/domain/TokenSigningConfig.js';
import {readSignedTokenClaims} from '@account/infrastructure/jsonwebtoken/readSignedTokenClaims.js';
import {CORE_CONFIG, CoreConfig} from '@core/domain/CoreConfig.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {inject, injectable} from 'inversify';

@injectable()
export class RefreshTokenVerifierJsonWebToken implements RefreshTokenVerifier {
  public constructor (
    @inject(TOKEN_SIGNING_CONFIG) private readonly tokenSigningConfig: TokenSigningConfig,
    @inject(CORE_CONFIG) private readonly coreConfig: CoreConfig
  ) {}

  public async verify (token: string): Promise<RefreshTokenClaims> {
    const signedTokenClaims = readSignedTokenClaims(token, {
      issuer: this.coreConfig.getApiName(),
      signingSecret: this.tokenSigningConfig.getSigningSecret(),
      tokenUse: 'refresh'
    });
    const provider = Object.values(IDENTITY_PROVIDERS).find((identityProvider) => identityProvider === signedTokenClaims?.payload.provider);

    if (!signedTokenClaims || provider === undefined) {
      throw new Unauthorized('Invalid refresh token');
    }

    return {
      accountId: signedTokenClaims.accountId,
      expiresAt: signedTokenClaims.expiresAt,
      issuedAt: signedTokenClaims.issuedAt,
      provider,
      tokenId: signedTokenClaims.tokenId
    };
  }
}
