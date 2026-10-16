import {ProviderPassword} from '@account/application/dto/provider/ProviderPassword.js';
import {BaseRegistration} from '@account/application/useCase/registration/BaseRegistration.js';
import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {ENCRYPTER, Encrypter} from '@account/domain/Encrypter.js';
import {Account} from '@account/domain/entity/Account.js';
import {IdentityProviderPassword} from '@account/domain/entity/IdentityProviderPassword.js';
import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {formatEmail} from '@core/application/stringFormatter.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {inject, injectable} from 'inversify';

const MINIMUM_PASSWORD_LENGTH = 8;

const MAXIMUM_PASSWORD_BYTES = 72;

const passwordProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.PASSWORD, {
  email: FieldSchemas.requiredString('email', IDENTITY_PROVIDERS.PASSWORD),
  password: FieldSchemas.requiredString('password', IDENTITY_PROVIDERS.PASSWORD)
});

@injectable()
export class PasswordRegistration extends BaseRegistration<ProviderPassword> {
  public constructor (
    @inject(ENCRYPTER) private readonly encrypter: Encrypter,
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(ACCOUNT_CONFIG) private readonly accountConfig: AccountConfig
  ) {
    super();
  }

  protected async buildAccount (providerData: ProviderPassword): Promise<Account> {
    this.accountConfig.getPasswordCompositionRules().ensureSatisfiedBy(providerData.password);

    const hashedPassword = await this.encrypter.encrypt(providerData.password);

    await this.checkIfEmailAlreadyExists(providerData.email);

    const identity = IdentityProviderPassword.create({
      disabledAt: null,
      hash: Uuid.create().toPrimitives(),
      password: hashedPassword,
      provider: IDENTITY_PROVIDERS.PASSWORD,
      verifiedAt: null
    });

    return Account.create({identity, primaryEmail: providerData.email, primaryPhone: null});
  }

  protected parseProviderData (rawProviderData: unknown): ProviderPassword {
    const providerData = parseWithSchema(passwordProviderDataSchema, rawProviderData);
    const email = formatEmail(providerData.email);

    Email.fromPrimitives(email);
    this.ensurePasswordLength(providerData.password);

    return {email, password: providerData.password};
  }

  private async checkIfEmailAlreadyExists (emailString: string): Promise<void> {
    const existingAccount = await this.accountRepository.findByEmail(Email.fromPrimitives(emailString));

    if (existingAccount) {
      // TODO(spec §4.3): notify the existing owner ("someone tried to register with your email")
      // through VerificationMessageSender once the communication context provides its adapter.
      throw new DuplicateContact('email');
    }
  }

  private ensurePasswordLength (password: string): void {
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      throw new InvalidArgument({customMessage: `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters long`});
    }

    if (Buffer.byteLength(password, 'utf8') > MAXIMUM_PASSWORD_BYTES) {
      throw new InvalidArgument({customMessage: `Password must be at most ${MAXIMUM_PASSWORD_BYTES} bytes long`});
    }
  }
}
