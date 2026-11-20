import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {RefreshTokenClaims, RefreshTokenVerifier} from '@account/domain/RefreshTokenVerifier.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export class RefreshTokenVerifierFake implements RefreshTokenVerifier {
  public async verify (token: string): Promise<RefreshTokenClaims> {
    const [tokenUse, accountId, provider] = token.split(':');
    const knownProvider = Object.values(IDENTITY_PROVIDERS).find((identityProvider) => identityProvider === provider);

    if (tokenUse !== 'refresh' || accountId === undefined || knownProvider === undefined) {
      throw new Unauthorized('Invalid refresh token');
    }

    return {accountId: Uuid.fromPrimitives(accountId), provider: knownProvider};
  }
}
