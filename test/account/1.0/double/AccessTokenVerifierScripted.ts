import {AccessTokenClaims, AccessTokenVerifier} from '@account/domain/AccessTokenVerifier.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';

export class AccessTokenVerifierScripted implements AccessTokenVerifier {
  public readonly claimsByToken: Map<string, AccessTokenClaims> = new Map<string, AccessTokenClaims>();

  public async verify (token: string): Promise<AccessTokenClaims> {
    const accessTokenClaims = this.claimsByToken.get(token);

    if (!accessTokenClaims) {
      throw new Unauthorized('Invalid access token');
    }

    return accessTokenClaims;
  }
}
