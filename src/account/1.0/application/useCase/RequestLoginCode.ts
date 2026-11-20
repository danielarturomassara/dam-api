import {LOGIN_CODE_REQUEST_STRATEGY_REGISTRY, LoginCodeRequestStrategy, LoginCodeRequestStrategyRegistry} from '@account/application/useCase/loginCode/LoginCodeRequestStrategy.js';
import {parseProviderEnvelope} from '@account/application/useCase/parseProviderEnvelope.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {inject, injectable} from 'inversify';

@injectable()
export class RequestLoginCode {
  public constructor (
    @inject(LOGIN_CODE_REQUEST_STRATEGY_REGISTRY) private readonly loginCodeRequestStrategyRegistry: LoginCodeRequestStrategyRegistry
  ) {}

  public async run (input: unknown): Promise<void> {
    const {providerName, rawProviderData} = parseProviderEnvelope(input);

    await this.getLoginCodeRequestStrategy(providerName).request(rawProviderData);
  }

  private getLoginCodeRequestStrategy (providerName: string): LoginCodeRequestStrategy {
    const provider = Object.values(IDENTITY_PROVIDERS).find((identityProvider) => identityProvider === providerName);

    if (provider === undefined) {
      throw new InvalidArgument({customMessage: `Unknown provider: ${providerName}`});
    }

    const loginCodeRequestStrategy = this.loginCodeRequestStrategyRegistry[provider];

    if (!loginCodeRequestStrategy) {
      throw new InvalidArgument({customMessage: `${provider} provider does not send login codes`});
    }

    return loginCodeRequestStrategy;
  }
}
