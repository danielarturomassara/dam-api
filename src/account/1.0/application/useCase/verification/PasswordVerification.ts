import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {VerificationStrategy} from '@account/application/useCase/verification/VerificationStrategy.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {Account} from '@account/domain/entity/Account.js';
import {IdentityProviderPassword} from '@account/domain/entity/IdentityProviderPassword.js';
import {VerificationNotProven} from '@account/domain/error/VerificationNotProven.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {formatEmail} from '@core/application/stringFormatter.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {inject, injectable} from 'inversify';

const passwordVerificationProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.PASSWORD, {
  email: FieldSchemas.requiredString('email', IDENTITY_PROVIDERS.PASSWORD),
  hash: FieldSchemas.requiredString('hash', IDENTITY_PROVIDERS.PASSWORD)
});

@injectable()
export class PasswordVerification implements VerificationStrategy {
  public constructor (
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository
  ) {}

  public async verify (rawProviderData: unknown): Promise<Account> {
    const providerData = parseWithSchema(passwordVerificationProviderDataSchema, rawProviderData);
    const email = Email.fromPrimitives(formatEmail(providerData.email));
    const account = await this.accountRepository.findByEmail(email);
    const identity = account?.matchesPrimaryEmail(email) ? account.getIdentity(IDENTITY_PROVIDERS.PASSWORD) : null;

    if (!account || !(identity instanceof IdentityProviderPassword)) {
      throw new VerificationNotProven();
    }

    identity.verifyWithHash(providerData.hash, new Date());

    return account;
  }
}
