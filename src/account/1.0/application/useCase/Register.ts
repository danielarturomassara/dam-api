import {RegisterRequest} from '@account/application/dto/RegisterRequest.js';
import {IdentityFactory} from '@account/application/IdentityFactory.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {ENCRYPTER, Encrypter} from '@account/domain/Encrypter.js';
import {Account} from '@account/domain/entity/Account.js';
import {UseCase} from '@core/application/UseCase.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {inject, injectable} from 'inversify';

@injectable()
export class Register extends UseCase<RegisterRequest, void> {
  public constructor (
    @inject(ENCRYPTER) private readonly encrypter: Encrypter,
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository
  ) {
    super();
  }

  public async run (request: RegisterRequest): Promise<void> {
    if (request.email) {
      await this.checkIfEmailAlreadyExists(request.email);
    }

    if (request.phone) {
      await this.checkIfPhoneAlreadyExists(request.phone);
    }

    const {password, ...rest} = request;

    const hashedPassword = password ? await this.encrypter.encrypt(password) : undefined;

    const identity = IdentityFactory.create({
      ...rest,
      disabledAt: null,
      passwordHash: hashedPassword,
      verifiedAt: null
    });

    const account = Account.create({
      disabledAt: null,
      identities: [identity.toPrimitives()],
      primaryEmail: request.email ?? null,
      primaryPhone: request.phone ?? null
    });

    await this.accountRepository.create(account);

    // TODO: Send verification email or WhatsApp message
  }

  private async checkIfEmailAlreadyExists (emailString: string): Promise<void> {
    const email = Email.fromPrimitives(emailString);

    const existingAccount = await this.accountRepository.findByEmail(email);

    if (existingAccount) {
      throw new Conflict('email');
    }
  }

  private async checkIfPhoneAlreadyExists (phoneString: string): Promise<void> {
    const phone = Phone.fromPrimitives(phoneString);

    const existingAccount = await this.accountRepository.findByPhone(phone);

    if (existingAccount) {
      throw new Conflict('phone');
    }
  }
}
