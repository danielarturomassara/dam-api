import {AuthenticateAccessToken} from '@account/application/useCase/AuthenticateAccessToken.js';
import {AccessTokenAuthenticator, Authentication} from '@core/domain/AccessTokenAuthenticator.js';
import {inject, injectable} from 'inversify';

@injectable()
export class AccessTokenAuthenticatorInProcess implements AccessTokenAuthenticator {
  public constructor (@inject(AuthenticateAccessToken) private readonly authenticateAccessToken: AuthenticateAccessToken) {}

  public async authenticate (accessToken: string): Promise<Authentication> {
    const accessTokenClaims = await this.authenticateAccessToken.run(accessToken);

    return {
      expiresAt: accessTokenClaims.expiresAt,
      issuedAt: accessTokenClaims.issuedAt,
      subjectId: accessTokenClaims.accountId,
      tokenId: accessTokenClaims.tokenId
    };
  }
}
