import {REGISTRATION_STRATEGY_REGISTRY, RegistrationStrategy, RegistrationStrategyRegistry} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {inject, injectable} from 'inversify';

interface RegisterEnvelope {
  providerName: string;
  rawProviderData: unknown;
}

@injectable()
export class Register {
  public constructor (
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(REGISTRATION_STRATEGY_REGISTRY) private readonly registrationStrategyRegistry: RegistrationStrategyRegistry
  ) {}

  public async run (input: unknown): Promise<void> {
    const {providerName, rawProviderData} = this.parseEnvelope(input);
    const registrationStrategy = this.getRegistrationStrategy(providerName);

    const account = await registrationStrategy.register(rawProviderData);

    await this.accountRepository.create(account);

    // TODO(spec §4.3/§4.4): send the verification message through VerificationMessageSender once
    // the communication context provides its adapter.
  }

  private getRegistrationStrategy (providerName: string): RegistrationStrategy {
    if (!this.isKnownProvider(providerName)) {
      throw new InvalidArgument({customMessage: `Unknown provider: ${providerName}`});
    }

    return this.registrationStrategyRegistry[providerName];
  }

  private isBlank (value: unknown): boolean {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  }

  private isKnownProvider (providerName: string): providerName is IDENTITY_PROVIDERS {
    return Object.hasOwn(this.registrationStrategyRegistry, providerName);
  }

  private parseEnvelope (input: unknown): RegisterEnvelope {
    if (typeof input !== 'object' || input === null) {
      throw new InvalidArgument({customMessage: 'provider is required'});
    }

    const providerValue: unknown = Reflect.get(input, 'provider');

    if (this.isBlank(providerValue)) {
      throw new InvalidArgument({customMessage: 'provider is required'});
    }

    if (typeof providerValue !== 'string') {
      throw new InvalidArgument({customMessage: `Unknown provider: ${String(providerValue)}`});
    }

    return {providerName: providerValue, rawProviderData: Reflect.get(input, 'providerData')};
  }
}
