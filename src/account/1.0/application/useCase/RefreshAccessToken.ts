import {RefreshAccessTokenOutput} from '@account/application/dto/RefreshAccessTokenOutput.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {REFRESH_TOKEN_VERIFIER, RefreshTokenVerifier} from '@account/domain/RefreshTokenVerifier.js';
import {TOKEN_ISSUER, TokenIssuer} from '@account/domain/TokenIssuer.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {inject, injectable} from 'inversify';

@injectable()
export class RefreshAccessToken {
  public constructor (
    @inject(REFRESH_TOKEN_VERIFIER) private readonly refreshTokenVerifier: RefreshTokenVerifier,
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer
  ) {}

  public async run (input: unknown): Promise<RefreshAccessTokenOutput> {
    const refreshTokenClaims = await this.refreshTokenVerifier.verify(this.parseRefreshToken(input));
    const account = await this.accountRepository.findById(refreshTokenClaims.accountId);
    const identity = account?.getIdentity(refreshTokenClaims.provider);

    if (!account || !identity) {
      throw new Unauthorized('Invalid refresh token');
    }

    account.ensureCanAuthenticateWith(identity);

    const accessToken = await this.tokenIssuer.issueAccessToken(account.id);

    return {accessToken: accessToken.token, expiresIn: accessToken.expiresInSeconds, tokenType: 'Bearer'};
  }

  private parseRefreshToken (input: unknown): string {
    const refreshToken: unknown = typeof input === 'object' && input !== null ? Reflect.get(input, 'refreshToken') : undefined;

    if (refreshToken === undefined || refreshToken === null || refreshToken === '') {
      throw new InvalidArgument({customMessage: 'refreshToken is required'});
    }

    if (typeof refreshToken !== 'string') {
      throw new InvalidArgument({customMessage: 'refreshToken must be a string'});
    }

    return refreshToken;
  }
}
