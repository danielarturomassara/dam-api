import {AppleRegistration} from '@account/application/useCase/registration/AppleRegistration.js';
import {GoogleRegistration} from '@account/application/useCase/registration/GoogleRegistration.js';
import {MetaRegistration} from '@account/application/useCase/registration/MetaRegistration.js';
import {PasswordRegistration} from '@account/application/useCase/registration/PasswordRegistration.js';
import {PhoneRegistration} from '@account/application/useCase/registration/PhoneRegistration.js';
import {RegistrationStrategyRegistry} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {AccountConfig} from '@account/domain/AccountConfig.js';
import {AccountRepository} from '@account/domain/AccountRepository.js';
import {Encrypter} from '@account/domain/Encrypter.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';

import {AccountConfigFake} from './AccountConfigFake.js';
import {EncrypterFake} from './EncrypterFake.js';

export const buildRegistrationStrategyRegistry = (
  accountRepository: AccountRepository,
  encrypter: Encrypter = new EncrypterFake(),
  accountConfig: AccountConfig = new AccountConfigFake()
): RegistrationStrategyRegistry => {
  return {
    [IDENTITY_PROVIDERS.APPLE]: new AppleRegistration(),
    [IDENTITY_PROVIDERS.GOOGLE]: new GoogleRegistration(),
    [IDENTITY_PROVIDERS.META]: new MetaRegistration(),
    [IDENTITY_PROVIDERS.PASSWORD]: new PasswordRegistration(encrypter, accountRepository, accountConfig),
    [IDENTITY_PROVIDERS.PHONE]: new PhoneRegistration(accountRepository, accountConfig)
  };
};
