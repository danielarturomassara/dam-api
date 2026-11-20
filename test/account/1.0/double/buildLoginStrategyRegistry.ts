import {AppleLogin} from '@account/application/useCase/login/AppleLogin.js';
import {GoogleLogin} from '@account/application/useCase/login/GoogleLogin.js';
import {LoginStrategyRegistry} from '@account/application/useCase/login/LoginStrategy.js';
import {MetaLogin} from '@account/application/useCase/login/MetaLogin.js';
import {PasswordLogin} from '@account/application/useCase/login/PasswordLogin.js';
import {PhoneLogin} from '@account/application/useCase/login/PhoneLogin.js';
import {AccountConfig} from '@account/domain/AccountConfig.js';
import {AccountRepository} from '@account/domain/AccountRepository.js';
import {Encrypter} from '@account/domain/Encrypter.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {LoginChallengeRepository} from '@account/domain/LoginChallengeRepository.js';

import {AccountConfigFake} from './AccountConfigFake.js';

export const buildLoginStrategyRegistry = (
  accountRepository: AccountRepository,
  loginChallengeRepository: LoginChallengeRepository,
  encrypter: Encrypter,
  accountConfig: AccountConfig = new AccountConfigFake()
): LoginStrategyRegistry => {
  return {
    [IDENTITY_PROVIDERS.APPLE]: new AppleLogin(),
    [IDENTITY_PROVIDERS.GOOGLE]: new GoogleLogin(),
    [IDENTITY_PROVIDERS.META]: new MetaLogin(),
    [IDENTITY_PROVIDERS.PASSWORD]: new PasswordLogin(encrypter, accountRepository),
    [IDENTITY_PROVIDERS.PHONE]: new PhoneLogin(encrypter, accountRepository, loginChallengeRepository, accountConfig)
  };
};
