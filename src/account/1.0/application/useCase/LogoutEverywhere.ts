import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {TOKEN_REVOCATION_REPOSITORY, TokenRevocationRepository} from '@account/domain/TokenRevocationRepository.js';
import {Authentication} from '@core/domain/AccessTokenAuthenticator.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {inject, injectable} from 'inversify';

const MILLISECONDS_PER_SECOND = 1000;

@injectable()
export class LogoutEverywhere {
  public constructor (
    @inject(TOKEN_REVOCATION_REPOSITORY) private readonly tokenRevocationRepository: TokenRevocationRepository,
    @inject(ACCOUNT_CONFIG) private readonly accountConfig: AccountConfig
  ) {}

  public async run (authentication: Authentication): Promise<void> {
    await this.revokeTokensIssuedBeforeTheRequest(authentication.subjectId);
    await this.revokeTokensIssuedWhileTheCutoffWasBeingStored(authentication.subjectId);
  }

  private async moveCutoffToNow (accountId: Uuid): Promise<void> {
    const issuedUntil = new Date();
    const expiresAt = new Date(issuedUntil.getTime() + this.accountConfig.getRefreshTokenLifetimeSeconds() * MILLISECONDS_PER_SECOND);

    await this.tokenRevocationRepository.revokeTokensOfAccount(accountId, issuedUntil, expiresAt);
  }

  private async revokeTokensIssuedBeforeTheRequest (accountId: Uuid): Promise<void> {
    await this.moveCutoffToNow(accountId);
  }

  private async revokeTokensIssuedWhileTheCutoffWasBeingStored (accountId: Uuid): Promise<void> {
    await this.moveCutoffToNow(accountId);
  }
}
