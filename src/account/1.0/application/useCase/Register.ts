import {parseProviderEnvelope} from '@account/application/useCase/parseProviderEnvelope.js';
import {REGISTRATION_STRATEGY_REGISTRY, RegistrationStrategy, RegistrationStrategyRegistry} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {inject, injectable} from 'inversify';

@injectable()
export class Register {
  public constructor (
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(REGISTRATION_STRATEGY_REGISTRY) private readonly registrationStrategyRegistry: RegistrationStrategyRegistry
  ) {}

  public async run (input: unknown): Promise<void> {
    const {providerName, rawProviderData} = parseProviderEnvelope(input);
    const registrationStrategy = this.getRegistrationStrategy(providerName);

    const account = await registrationStrategy.register(rawProviderData);

    await this.accountRepository.create(account);
  }

  private getRegistrationStrategy (providerName: string): RegistrationStrategy {
    if (!this.isKnownProvider(providerName)) {
      throw new InvalidArgument({customMessage: `Unknown provider: ${providerName}`});
    }

    return this.registrationStrategyRegistry[providerName];
  }

  private isKnownProvider (providerName: string): providerName is IDENTITY_PROVIDERS {
    return Object.hasOwn(this.registrationStrategyRegistry, providerName);
  }
}
