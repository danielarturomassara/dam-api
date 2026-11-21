import {RefreshTokenClaims, RefreshTokenVerifier} from '@account/domain/RefreshTokenVerifier.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';

export class RefreshTokenVerifierScripted implements RefreshTokenVerifier {
  public readonly claimsByToken: Map<string, RefreshTokenClaims> = new Map<string, RefreshTokenClaims>();

  public async verify (token: string): Promise<RefreshTokenClaims> {
    const refreshTokenClaims = this.claimsByToken.get(token);

    if (!refreshTokenClaims) {
      throw new Unauthorized('Invalid refresh token');
    }

    return refreshTokenClaims;
  }
}
