import {RegistrationStrategy} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {Account} from '@account/domain/entity/Account.js';

export abstract class BaseRegistration<PROVIDER_DATA> implements RegistrationStrategy {
  public constructor () {}

  public async register (rawProviderData: unknown): Promise<Account> {
    const providerData = this.parseProviderData(rawProviderData);

    return this.buildAccount(providerData);
  }

  protected abstract buildAccount (providerData: PROVIDER_DATA): Promise<Account>;

  protected abstract parseProviderData (rawProviderData: unknown): PROVIDER_DATA;
}
