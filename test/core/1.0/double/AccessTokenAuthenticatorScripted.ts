import {AccessTokenAuthenticator, Authentication} from '@core/domain/AccessTokenAuthenticator.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export class AccessTokenAuthenticatorScripted implements AccessTokenAuthenticator {
  public nextAuthentication: Authentication = {
    expiresAt: new Date('2026-03-01T10:15:00.000Z'),
    issuedAt: new Date('2026-03-01T10:00:00.000Z'),
    subjectId: Uuid.create(),
    tokenId: Uuid.create()
  };

  public nextError: Nullable<Error> = null;

  public readonly receivedTokenList: Array<string> = [];

  public async authenticate (accessToken: string): Promise<Authentication> {
    this.receivedTokenList.push(accessToken);

    if (this.nextError) {
      throw this.nextError;
    }

    return this.nextAuthentication;
  }
}
