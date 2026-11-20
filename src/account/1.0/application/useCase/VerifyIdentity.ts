import {parseProviderEnvelope} from '@account/application/useCase/parseProviderEnvelope.js';
import {VERIFICATION_STRATEGY_REGISTRY, VerificationStrategy, VerificationStrategyRegistry} from '@account/application/useCase/verification/VerificationStrategy.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {inject, injectable} from 'inversify';

@injectable()
export class VerifyIdentity {
  public constructor (
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(VERIFICATION_STRATEGY_REGISTRY) private readonly verificationStrategyRegistry: VerificationStrategyRegistry
  ) {}

  public async run (input: unknown): Promise<void> {
    const {providerName, rawProviderData} = parseProviderEnvelope(input);
    const account = await this.getVerificationStrategy(providerName).verify(rawProviderData);

    await this.accountRepository.update(account);
  }

  private getVerificationStrategy (providerName: string): VerificationStrategy {
    const provider = Object.values(IDENTITY_PROVIDERS).find((identityProvider) => identityProvider === providerName);

    if (provider === undefined) {
      throw new InvalidArgument({customMessage: `Unknown provider: ${providerName}`});
    }

    const verificationStrategy = this.verificationStrategyRegistry[provider];

    if (!verificationStrategy) {
      throw new InvalidArgument({customMessage: `${provider} provider has no verification step`});
    }

    return verificationStrategy;
  }
}
