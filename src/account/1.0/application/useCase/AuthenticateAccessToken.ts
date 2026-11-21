import {ACCESS_TOKEN_VERIFIER, AccessTokenClaims, AccessTokenVerifier} from '@account/domain/AccessTokenVerifier.js';
import {TOKEN_REVOCATION_REPOSITORY, TokenRevocationRepository} from '@account/domain/TokenRevocationRepository.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {inject, injectable} from 'inversify';

@injectable()
export class AuthenticateAccessToken {
  public constructor (
    @inject(ACCESS_TOKEN_VERIFIER) private readonly accessTokenVerifier: AccessTokenVerifier,
    @inject(TOKEN_REVOCATION_REPOSITORY) private readonly tokenRevocationRepository: TokenRevocationRepository
  ) {}

  public async run (accessToken: string): Promise<AccessTokenClaims> {
    const accessTokenClaims = await this.accessTokenVerifier.verify(accessToken);

    if (await this.tokenRevocationRepository.isRevoked(accessTokenClaims)) {
      throw new Unauthorized('Invalid access token');
    }

    return accessTokenClaims;
  }
}
