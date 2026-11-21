import {AccessTokenClaims, AccessTokenVerifier} from '@account/domain/AccessTokenVerifier.js';
import {TOKEN_SIGNING_CONFIG, TokenSigningConfig} from '@account/domain/TokenSigningConfig.js';
import {readSignedTokenClaims} from '@account/infrastructure/jsonwebtoken/readSignedTokenClaims.js';
import {CORE_CONFIG, CoreConfig} from '@core/domain/CoreConfig.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {inject, injectable} from 'inversify';

@injectable()
export class AccessTokenVerifierJsonWebToken implements AccessTokenVerifier {
  public constructor (
    @inject(TOKEN_SIGNING_CONFIG) private readonly tokenSigningConfig: TokenSigningConfig,
    @inject(CORE_CONFIG) private readonly coreConfig: CoreConfig
  ) {}

  public async verify (token: string): Promise<AccessTokenClaims> {
    const signedTokenClaims = readSignedTokenClaims(token, {
      issuer: this.coreConfig.getApiName(),
      signingSecret: this.tokenSigningConfig.getSigningSecret(),
      tokenUse: 'access'
    });

    if (!signedTokenClaims) {
      throw new Unauthorized('Invalid access token');
    }

    return {
      accountId: signedTokenClaims.accountId,
      expiresAt: signedTokenClaims.expiresAt,
      issuedAt: signedTokenClaims.issuedAt,
      tokenId: signedTokenClaims.tokenId
    };
  }
}
