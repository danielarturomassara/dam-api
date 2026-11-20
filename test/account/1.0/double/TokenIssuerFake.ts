import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {IssuedToken, TokenIssuer} from '@account/domain/TokenIssuer.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export class TokenIssuerFake implements TokenIssuer {
  public readonly issuedList: Array<string> = [];

  public async issueAccessToken (accountId: Uuid): Promise<IssuedToken> {
    return this.issue(`access:${accountId.toPrimitives()}`, 900);
  }

  public async issueRefreshToken (accountId: Uuid, provider: IDENTITY_PROVIDERS): Promise<IssuedToken> {
    return this.issue(`refresh:${accountId.toPrimitives()}:${provider}`, 2_592_000);
  }

  private issue (token: string, expiresInSeconds: number): IssuedToken {
    this.issuedList.push(token);

    return {expiresInSeconds, token};
  }
}
