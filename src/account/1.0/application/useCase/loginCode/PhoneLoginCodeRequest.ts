import {LoginCodeRequestStrategy} from '@account/application/useCase/loginCode/LoginCodeRequestStrategy.js';
import {parseLoginCodePhone} from '@account/application/useCase/loginCode/parseLoginCodePhone.js';
import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {ENCRYPTER, Encrypter} from '@account/domain/Encrypter.js';
import {Account} from '@account/domain/entity/Account.js';
import {LoginChallenge} from '@account/domain/entity/LoginChallenge.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {LOGIN_CHALLENGE_REPOSITORY, LoginChallengeRepository} from '@account/domain/LoginChallengeRepository.js';
import {LOGIN_CODE_SENDER, LoginCodeSender} from '@account/domain/LoginCodeSender.js';
import {VerificationCode} from '@account/domain/valueObject/VerificationCode.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {TooManyRequests} from '@core/domain/error/TooManyRequests.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {inject, injectable} from 'inversify';

@injectable()
export class PhoneLoginCodeRequest implements LoginCodeRequestStrategy {
  public constructor (
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(LOGIN_CHALLENGE_REPOSITORY) private readonly loginChallengeRepository: LoginChallengeRepository,
    @inject(ENCRYPTER) private readonly encrypter: Encrypter,
    @inject(ACCOUNT_CONFIG) private readonly accountConfig: AccountConfig,
    @inject(LOGIN_CODE_SENDER) private readonly loginCodeSender: LoginCodeSender
  ) {}

  public async request (rawProviderData: unknown): Promise<void> {
    const phone = parseLoginCodePhone(rawProviderData);
    const account = await this.findAccountThatMayLogIn(phone);
    const loginChallengePolicy = this.accountConfig.getLoginChallengePolicy().toPrimitives();

    const latestChallenge = await this.findLatestChallengeOutsideResendInterval(account, loginChallengePolicy.resendIntervalSeconds);
    const code = VerificationCode.generate(this.accountConfig.getVerificationCodeLength());

    await this.createChallengeUnlessSuperseded(LoginChallenge.create({
      accountId: account.id.toPrimitives(),
      codeHash: await this.encrypter.encrypt(code.toPrimitives()),
      lifetimeSeconds: loginChallengePolicy.lifetimeSeconds,
      provider: IDENTITY_PROVIDERS.PHONE,
      supersededChallenge: latestChallenge
    }));

    await this.loginCodeSender.sendPhoneLoginCode(phone, code);
  }

  private async createChallengeUnlessSuperseded (loginChallenge: LoginChallenge): Promise<void> {
    try {
      await this.loginChallengeRepository.create(loginChallenge);
    } catch (error) {
      if (error instanceof Conflict) {
        throw new TooManyRequests();
      }

      throw error;
    }
  }

  private async findLatestChallengeOutsideResendInterval (account: Account, resendIntervalSeconds: number): Promise<Nullable<LoginChallenge>> {
    const latestChallenge = await this.loginChallengeRepository.findLatestByAccount(account.id, IDENTITY_PROVIDERS.PHONE);

    if (latestChallenge && !latestChallenge.isConsumed() && latestChallenge.wasCreatedWithin(resendIntervalSeconds, new Date())) {
      throw new TooManyRequests();
    }

    return latestChallenge;
  }

  private async findAccountThatMayLogIn (phone: Phone): Promise<Account> {
    const account = await this.accountRepository.findByPhone(phone);
    const identity = account?.matchesPrimaryPhone(phone) ? account.getIdentity(IDENTITY_PROVIDERS.PHONE) : null;

    if (!account || !identity) {
      throw new NotFound('Account');
    }

    account.ensureCanAuthenticateWith(identity);

    return account;
  }
}
