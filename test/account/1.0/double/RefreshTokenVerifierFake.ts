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

    const issuedAt = new Date();

    return {accountId: Uuid.fromPrimitives(accountId), expiresAt: new Date(issuedAt.getTime() + 2_592_000_000), issuedAt, provider: knownProvider, tokenId: Uuid.create()};
  }
}
