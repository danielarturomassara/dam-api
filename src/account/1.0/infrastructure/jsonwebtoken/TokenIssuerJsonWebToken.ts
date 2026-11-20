import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {IssuedToken, TokenIssuer} from '@account/domain/TokenIssuer.js';
import {TOKEN_SIGNING_CONFIG, TokenSigningConfig} from '@account/domain/TokenSigningConfig.js';
import {CORE_CONFIG, CoreConfig} from '@core/domain/CoreConfig.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {inject, injectable} from 'inversify';
import jsonwebtoken from 'jsonwebtoken';

@injectable()
export class TokenIssuerJsonWebToken implements TokenIssuer {
  public constructor (
    @inject(TOKEN_SIGNING_CONFIG) private readonly tokenSigningConfig: TokenSigningConfig,
    @inject(ACCOUNT_CONFIG) private readonly accountConfig: AccountConfig,
    @inject(CORE_CONFIG) private readonly coreConfig: CoreConfig
  ) {}

  public async issueAccessToken (accountId: Uuid): Promise<IssuedToken> {
    return this.sign({token_use: 'access'}, accountId, this.accountConfig.getAccessTokenLifetimeSeconds());
  }

  public async issueRefreshToken (accountId: Uuid, provider: IDENTITY_PROVIDERS): Promise<IssuedToken> {
    return this.sign({provider, token_use: 'refresh'}, accountId, this.accountConfig.getRefreshTokenLifetimeSeconds());
  }

  private sign (claims: Record<string, string>, accountId: Uuid, lifetimeSeconds: number): IssuedToken {
    const token = jsonwebtoken.sign(claims, this.tokenSigningConfig.getSigningSecret(), {
      algorithm: 'HS256',
      expiresIn: lifetimeSeconds,
      issuer: this.coreConfig.getApiName(),
      jwtid: Uuid.create().toPrimitives(),
      subject: accountId.toPrimitives()
    });

    return {expiresInSeconds: lifetimeSeconds, token};
  }
}
