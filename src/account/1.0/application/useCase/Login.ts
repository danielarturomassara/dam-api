import {LoginOutput} from '@account/application/dto/LoginOutput.js';
import {LOGIN_STRATEGY_REGISTRY, LoginStrategy, LoginStrategyRegistry} from '@account/application/useCase/login/LoginStrategy.js';
import {parseProviderEnvelope} from '@account/application/useCase/parseProviderEnvelope.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {TOKEN_ISSUER, TokenIssuer} from '@account/domain/TokenIssuer.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {inject, injectable} from 'inversify';

@injectable()
export class Login {
  public constructor (
    @inject(LOGIN_STRATEGY_REGISTRY) private readonly loginStrategyRegistry: LoginStrategyRegistry,
    @inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository
  ) {}

  public async run (input: unknown): Promise<LoginOutput> {
    const {providerName, rawProviderData} = parseProviderEnvelope(input);
    const {account, identity} = await this.getLoginStrategy(providerName).authenticate(rawProviderData);

    if (account.recordProvenCredential(identity)) {
      await this.accountRepository.update(account);
    }

    account.ensureCanAuthenticateWith(identity);

    const accessToken = await this.tokenIssuer.issueAccessToken(account.id);
    const refreshToken = await this.tokenIssuer.issueRefreshToken(account.id, identity.provider);

    return {
      accessToken: accessToken.token,
      expiresIn: accessToken.expiresInSeconds,
      refreshExpiresIn: refreshToken.expiresInSeconds,
      refreshToken: refreshToken.token,
      tokenType: 'Bearer'
    };
  }

  private getLoginStrategy (providerName: string): LoginStrategy {
    if (!this.isKnownProvider(providerName)) {
      throw new InvalidArgument({customMessage: `Unknown provider: ${providerName}`});
    }

    return this.loginStrategyRegistry[providerName];
  }

  private isKnownProvider (providerName: string): providerName is IDENTITY_PROVIDERS {
    return Object.hasOwn(this.loginStrategyRegistry, providerName);
  }
}
