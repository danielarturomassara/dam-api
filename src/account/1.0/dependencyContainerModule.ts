import {Login} from '@account/application/useCase/Login.js';
import {AppleLogin} from '@account/application/useCase/login/AppleLogin.js';
import {GoogleLogin} from '@account/application/useCase/login/GoogleLogin.js';
import {LOGIN_STRATEGY_REGISTRY, LoginStrategyRegistry} from '@account/application/useCase/login/LoginStrategy.js';
import {MetaLogin} from '@account/application/useCase/login/MetaLogin.js';
import {PasswordLogin} from '@account/application/useCase/login/PasswordLogin.js';
import {PhoneLogin} from '@account/application/useCase/login/PhoneLogin.js';
import {LoginCodeRequestNotAvailable} from '@account/application/useCase/loginCode/LoginCodeRequestNotAvailable.js';
import {LOGIN_CODE_REQUEST_STRATEGY_REGISTRY, LoginCodeRequestStrategyRegistry} from '@account/application/useCase/loginCode/LoginCodeRequestStrategy.js';
import {RefreshAccessToken} from '@account/application/useCase/RefreshAccessToken.js';
import {Register} from '@account/application/useCase/Register.js';
import {AppleRegistration} from '@account/application/useCase/registration/AppleRegistration.js';
import {GoogleRegistration} from '@account/application/useCase/registration/GoogleRegistration.js';
import {MetaRegistration} from '@account/application/useCase/registration/MetaRegistration.js';
import {PasswordRegistration} from '@account/application/useCase/registration/PasswordRegistration.js';
import {PhoneRegistration} from '@account/application/useCase/registration/PhoneRegistration.js';
import {REGISTRATION_STRATEGY_REGISTRY, RegistrationStrategyRegistry} from '@account/application/useCase/registration/RegistrationStrategy.js';
import {RequestLoginCode} from '@account/application/useCase/RequestLoginCode.js';
import {PasswordVerification} from '@account/application/useCase/verification/PasswordVerification.js';
import {VERIFICATION_STRATEGY_REGISTRY, VerificationStrategyRegistry} from '@account/application/useCase/verification/VerificationStrategy.js';
import {VerifyIdentity} from '@account/application/useCase/VerifyIdentity.js';
import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {ENCRYPTER, Encrypter} from '@account/domain/Encrypter.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {LOGIN_CHALLENGE_REPOSITORY, LoginChallengeRepository} from '@account/domain/LoginChallengeRepository.js';
import {REFRESH_TOKEN_VERIFIER, RefreshTokenVerifier} from '@account/domain/RefreshTokenVerifier.js';
import {TOKEN_ISSUER, TokenIssuer} from '@account/domain/TokenIssuer.js';
import {TOKEN_SIGNING_CONFIG, TokenSigningConfig} from '@account/domain/TokenSigningConfig.js';
import {AccountConfigEnvironment} from '@account/infrastructure/AccountConfigEnvironment.js';
import {EncrypterBcrypt} from '@account/infrastructure/EncrypterBcrypt.js';
import {RefreshTokenVerifierJsonWebToken} from '@account/infrastructure/jsonwebtoken/RefreshTokenVerifierJsonWebToken.js';
import {TokenIssuerJsonWebToken} from '@account/infrastructure/jsonwebtoken/TokenIssuerJsonWebToken.js';
import {AccountRepositoryMongo} from '@account/infrastructure/mongodb/AccountRepositoryMongo.js';
import {LoginChallengeRepositoryMongo} from '@account/infrastructure/mongodb/LoginChallengeRepositoryMongo.js';
import {TokenSigningConfigEnvironment} from '@account/infrastructure/TokenSigningConfigEnvironment.js';
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

  options.bind<TokenSigningConfig>(TOKEN_SIGNING_CONFIG).to(TokenSigningConfigEnvironment).inSingletonScope();
  options.bind<TokenSigningConfig>(STARTUP_CONFIG_VALIDATION).toService(TOKEN_SIGNING_CONFIG);
  options.bind<TokenIssuer>(TOKEN_ISSUER).to(TokenIssuerJsonWebToken).inSingletonScope();
  options.bind<RefreshTokenVerifier>(REFRESH_TOKEN_VERIFIER).to(RefreshTokenVerifierJsonWebToken).inSingletonScope();
  options.bind<LoginChallengeRepository>(LOGIN_CHALLENGE_REPOSITORY).to(LoginChallengeRepositoryMongo).inSingletonScope();
  options.bind<AppleLogin>(AppleLogin).toSelf();
  options.bind<GoogleLogin>(GoogleLogin).toSelf();
  options.bind<MetaLogin>(MetaLogin).toSelf();
  options.bind<PasswordLogin>(PasswordLogin).toSelf();
  options.bind<PhoneLogin>(PhoneLogin).toSelf();
  options.bind<LoginCodeRequestNotAvailable>(LoginCodeRequestNotAvailable).toSelf();
  options.bind<Login>(Login).toSelf();
  options.bind<RequestLoginCode>(RequestLoginCode).toSelf();
  options.bind<RefreshAccessToken>(RefreshAccessToken).toSelf();
  options.bind<PasswordVerification>(PasswordVerification).toSelf();
  options.bind<VerifyIdentity>(VerifyIdentity).toSelf();

  options.bind<LoginStrategyRegistry>(LOGIN_STRATEGY_REGISTRY)
    .toDynamicValue((context): LoginStrategyRegistry => {
      return {
        [IDENTITY_PROVIDERS.APPLE]: context.get(AppleLogin),
        [IDENTITY_PROVIDERS.GOOGLE]: context.get(GoogleLogin),
        [IDENTITY_PROVIDERS.META]: context.get(MetaLogin),
        [IDENTITY_PROVIDERS.PASSWORD]: context.get(PasswordLogin),
        [IDENTITY_PROVIDERS.PHONE]: context.get(PhoneLogin)
      } satisfies LoginStrategyRegistry;
    })
    .inSingletonScope();

  options.bind<LoginCodeRequestStrategyRegistry>(LOGIN_CODE_REQUEST_STRATEGY_REGISTRY)
    .toDynamicValue((context): LoginCodeRequestStrategyRegistry => {
      return {
        [IDENTITY_PROVIDERS.PHONE]: context.get(LoginCodeRequestNotAvailable)
      } satisfies LoginCodeRequestStrategyRegistry;
    })
    .inSingletonScope();

  options.bind<VerificationStrategyRegistry>(VERIFICATION_STRATEGY_REGISTRY)
    .toDynamicValue((context): VerificationStrategyRegistry => {
      return {
        [IDENTITY_PROVIDERS.PASSWORD]: context.get(PasswordVerification)
      } satisfies VerificationStrategyRegistry;
    })
    .inSingletonScope();

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
