import {parseRefreshToken} from '@account/application/useCase/parseRefreshToken.js';
import {REFRESH_TOKEN_VERIFIER, RefreshTokenVerifier} from '@account/domain/RefreshTokenVerifier.js';
import {TOKEN_REVOCATION_REPOSITORY, TokenRevocationRepository} from '@account/domain/TokenRevocationRepository.js';
import {Authentication} from '@core/domain/AccessTokenAuthenticator.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {inject, injectable} from 'inversify';

@injectable()
export class Logout {
  public constructor (
    @inject(REFRESH_TOKEN_VERIFIER) private readonly refreshTokenVerifier: RefreshTokenVerifier,
    @inject(TOKEN_REVOCATION_REPOSITORY) private readonly tokenRevocationRepository: TokenRevocationRepository
  ) {}

  public async run (authentication: Authentication, input: unknown): Promise<void> {
    const refreshTokenClaims = await this.refreshTokenVerifier.verify(parseRefreshToken(input));

    if (refreshTokenClaims.accountId.toPrimitives() !== authentication.subjectId.toPrimitives()) {
      throw new Unauthorized('Invalid refresh token');
    }

    await this.tokenRevocationRepository.revokeToken(refreshTokenClaims.tokenId, refreshTokenClaims.expiresAt);
    await this.tokenRevocationRepository.revokeToken(authentication.tokenId, authentication.expiresAt);
  }
}
