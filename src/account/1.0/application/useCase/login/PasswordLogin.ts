import {AuthenticatedIdentity, LoginStrategy} from '@account/application/useCase/login/LoginStrategy.js';
import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {ENCRYPTER, Encrypter} from '@account/domain/Encrypter.js';
import {IdentityProviderPassword} from '@account/domain/entity/IdentityProviderPassword.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {formatEmail} from '@core/application/stringFormatter.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {inject, injectable} from 'inversify';

const MAXIMUM_PASSWORD_BYTES = 72;

const TIMING_EQUALIZATION_TEXT = 'timing-equalization';

const passwordProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.PASSWORD, {
  email: FieldSchemas.requiredString('email', IDENTITY_PROVIDERS.PASSWORD),
  password: FieldSchemas.requiredString('password', IDENTITY_PROVIDERS.PASSWORD)
});

@injectable()
export class PasswordLogin implements LoginStrategy {
  public constructor (
    @inject(ENCRYPTER) private readonly encrypter: Encrypter,
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository
  ) {}

  public async authenticate (rawProviderData: unknown): Promise<AuthenticatedIdentity> {
    const providerData = parseWithSchema(passwordProviderDataSchema, rawProviderData);
    const email = Email.fromPrimitives(formatEmail(providerData.email));
    const account = await this.accountRepository.findByEmail(email);
    const identity = account?.matchesPrimaryEmail(email) ? account.getIdentity(IDENTITY_PROVIDERS.PASSWORD) : null;

    if (!account || !(identity instanceof IdentityProviderPassword) || this.isOverLong(providerData.password)) {
      await this.encrypter.encrypt(TIMING_EQUALIZATION_TEXT);

      throw new Unauthorized('Invalid credentials');
    }

    if (!await this.encrypter.compare(providerData.password, identity.password.toPrimitives())) {
      throw new Unauthorized('Invalid credentials');
    }

    return {account, identity};
  }

  private isOverLong (password: string): boolean {
    return Buffer.byteLength(password, 'utf8') > MAXIMUM_PASSWORD_BYTES;
  }
}
