import {ProviderPhone} from '@account/application/dto/provider/ProviderPhone.js';
import {BaseRegistration} from '@account/application/useCase/registration/BaseRegistration.js';
import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {Account} from '@account/domain/entity/Account.js';
import {IdentityProviderPhone} from '@account/domain/entity/IdentityProviderPhone.js';
import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {VerificationCode} from '@account/domain/valueObject/VerificationCode.js';
import {formatE164} from '@core/application/stringFormatter.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {inject, injectable} from 'inversify';

const phoneProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.PHONE, {
  phone: FieldSchemas.requiredString('phone', IDENTITY_PROVIDERS.PHONE)
});

@injectable()
export class PhoneRegistration extends BaseRegistration<ProviderPhone> {
  public constructor (
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(ACCOUNT_CONFIG) private readonly accountConfig: AccountConfig
  ) {
    super();
  }

  protected async buildAccount (providerData: ProviderPhone): Promise<Account> {
    await this.checkIfPhoneAlreadyExists(providerData.phone);

    const identity = IdentityProviderPhone.create({
      code: VerificationCode.generate(this.accountConfig.getVerificationCodeLength()).toPrimitives(),
      disabledAt: null,
      provider: IDENTITY_PROVIDERS.PHONE,
      verifiedAt: null
    });

    return Account.create({identity, primaryEmail: null, primaryPhone: providerData.phone});
  }

  protected parseProviderData (rawProviderData: unknown): ProviderPhone {
    const providerData = parseWithSchema(phoneProviderDataSchema, rawProviderData);
    const phone = this.normalizePhone(providerData.phone);

    Phone.fromPrimitives(phone);

    return {phone};
  }

  private async checkIfPhoneAlreadyExists (phoneString: string): Promise<void> {
    const existingAccount = await this.accountRepository.findByPhone(Phone.fromPrimitives(phoneString));

    if (existingAccount) {
      // TODO(spec §4.4): notify the existing owner ("someone tried to register with your phone
      // number") through VerificationMessageSender once the communication context provides its adapter.
      throw new DuplicateContact('phone');
    }
  }

  private normalizePhone (phone: string): string {
    const trimmedPhone = phone.trim();

    if (trimmedPhone.startsWith('+') || trimmedPhone.startsWith('00')) {
      return formatE164(trimmedPhone);
    }

    return trimmedPhone;
  }
}
