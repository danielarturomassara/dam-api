import {Register} from '@account/application/useCase/Register.js';
import {AppleRegistration} from '@account/application/useCase/registration/AppleRegistration.js';
import {GoogleRegistration} from '@account/application/useCase/registration/GoogleRegistration.js';
import {MetaRegistration} from '@account/application/useCase/registration/MetaRegistration.js';
import {PasswordRegistration} from '@account/application/useCase/registration/PasswordRegistration.js';
import {PhoneRegistration} from '@account/application/useCase/registration/PhoneRegistration.js';
import {REGISTRATION_STRATEGY_REGISTRY, RegistrationStrategyRegistry} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {ENCRYPTER, Encrypter} from '@account/domain/Encrypter.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {AccountConfigEnvironment} from '@account/infrastructure/AccountConfigEnvironment.js';
import {EncrypterBcrypt} from '@account/infrastructure/EncrypterBcrypt.js';
import {AccountRepositoryMongo} from '@account/infrastructure/mongodb/AccountRepositoryMongo.js';
import {STARTUP_CONFIG_VALIDATION} from '@core/domain/StartupConfigValidation.js';
import {ContainerModule, ContainerModuleLoadOptions} from 'inversify';

export default new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind<AccountConfig>(ACCOUNT_CONFIG).to(AccountConfigEnvironment).inSingletonScope();
  options.bind<AccountConfig>(STARTUP_CONFIG_VALIDATION).toService(ACCOUNT_CONFIG);
  options.bind<AccountRepository>(ACCOUNT_REPOSITORY).to(AccountRepositoryMongo).inSingletonScope();
  options.bind<Encrypter>(ENCRYPTER).to(EncrypterBcrypt).inSingletonScope();
  options.bind<AppleRegistration>(AppleRegistration).toSelf();
  options.bind<GoogleRegistration>(GoogleRegistration).toSelf();
  options.bind<MetaRegistration>(MetaRegistration).toSelf();
  options.bind<PasswordRegistration>(PasswordRegistration).toSelf();
  options.bind<PhoneRegistration>(PhoneRegistration).toSelf();
  options.bind<Register>(Register).toSelf();

  options.bind<RegistrationStrategyRegistry>(REGISTRATION_STRATEGY_REGISTRY)
    .toDynamicValue((context): RegistrationStrategyRegistry => {
      return {
        [IDENTITY_PROVIDERS.APPLE]: context.get(AppleRegistration),
        [IDENTITY_PROVIDERS.GOOGLE]: context.get(GoogleRegistration),
        [IDENTITY_PROVIDERS.META]: context.get(MetaRegistration),
        [IDENTITY_PROVIDERS.PASSWORD]: context.get(PasswordRegistration),
        [IDENTITY_PROVIDERS.PHONE]: context.get(PhoneRegistration)
      } satisfies RegistrationStrategyRegistry;
    })
    .inSingletonScope();
});
