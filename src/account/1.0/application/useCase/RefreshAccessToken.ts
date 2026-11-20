import {RefreshAccessTokenOutput} from '@account/application/dto/RefreshAccessTokenOutput.js';
import {parseRefreshToken} from '@account/application/useCase/parseRefreshToken.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {REFRESH_TOKEN_VERIFIER, RefreshTokenClaims, RefreshTokenVerifier} from '@account/domain/RefreshTokenVerifier.js';
import {TOKEN_ISSUER, TokenIssuer} from '@account/domain/TokenIssuer.js';
import {TOKEN_REVOCATION_REPOSITORY, TokenRevocationRepository} from '@account/domain/TokenRevocationRepository.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {inject, injectable} from 'inversify';

@injectable()
export class RefreshAccessToken {
  public constructor (
    @inject(REFRESH_TOKEN_VERIFIER) private readonly refreshTokenVerifier: RefreshTokenVerifier,
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @inject(TOKEN_REVOCATION_REPOSITORY) private readonly tokenRevocationRepository: TokenRevocationRepository
  ) {}

  public async run (input: unknown): Promise<RefreshAccessTokenOutput> {
    const refreshTokenClaims = await this.refreshTokenVerifier.verify(parseRefreshToken(input));

    await this.ensureIsNotRevoked(refreshTokenClaims);

    const account = await this.accountRepository.findById(refreshTokenClaims.accountId);
    const identity = account?.getIdentity(refreshTokenClaims.provider);

    if (!account || !identity) {
      throw new Unauthorized('Invalid refresh token');
    }

    account.ensureCanAuthenticateWith(identity);

    const accessToken = await this.tokenIssuer.issueAccessToken(account.id);

    await this.ensureWasNotRevokedWhileIssuing(refreshTokenClaims);

    return {accessToken: accessToken.token, expiresIn: accessToken.expiresInSeconds, tokenType: 'Bearer'};
  }

  private async ensureIsNotRevoked (refreshTokenClaims: RefreshTokenClaims): Promise<void> {
    if (await this.tokenRevocationRepository.isRevoked(refreshTokenClaims)) {
      throw new Unauthorized('Invalid refresh token');
    }
  }

  private async ensureWasNotRevokedWhileIssuing (refreshTokenClaims: RefreshTokenClaims): Promise<void> {
    await this.ensureIsNotRevoked(refreshTokenClaims);
  }
}
