import {normalizePhone} from '@account/application/normalizePhone.js';
import {AuthenticatedIdentity, LoginStrategy} from '@account/application/useCase/login/LoginStrategy.js';
import {FieldSchemas} from '@account/application/useCase/registration/FieldSchemas.js';
import {parseWithSchema} from '@account/application/useCase/registration/parseWithSchema.js';
import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {ACCOUNT_REPOSITORY, AccountRepository} from '@account/domain/AccountRepository.js';
import {ENCRYPTER, Encrypter} from '@account/domain/Encrypter.js';
import {LoginChallenge} from '@account/domain/entity/LoginChallenge.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {LOGIN_CHALLENGE_REPOSITORY, LoginChallengeRepository} from '@account/domain/LoginChallengeRepository.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Unauthorized} from '@core/domain/error/Unauthorized.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {inject, injectable} from 'inversify';

const TIMING_EQUALIZATION_TEXT = 'timing-equalization';

const DIGITS_ONLY_PATTERN = /^\d+$/;

const phoneLoginProviderDataSchema = FieldSchemas.providerData(IDENTITY_PROVIDERS.PHONE, {
  code: FieldSchemas.requiredString('code', IDENTITY_PROVIDERS.PHONE),
  phone: FieldSchemas.requiredString('phone', IDENTITY_PROVIDERS.PHONE)
});

@injectable()
export class PhoneLogin implements LoginStrategy {
  public constructor (
    @inject(ENCRYPTER) private readonly encrypter: Encrypter,
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @inject(LOGIN_CHALLENGE_REPOSITORY) private readonly loginChallengeRepository: LoginChallengeRepository,
    @inject(ACCOUNT_CONFIG) private readonly accountConfig: AccountConfig
  ) {}

  public async authenticate (rawProviderData: unknown): Promise<AuthenticatedIdentity> {
    const providerData = parseWithSchema(phoneLoginProviderDataSchema, rawProviderData);
    const phone = Phone.fromPrimitives(normalizePhone(providerData.phone));
    const code = this.parseCode(providerData.code);
    const account = await this.accountRepository.findByPhone(phone);
    const identity = account?.matchesPrimaryPhone(phone) ? account.getIdentity(IDENTITY_PROVIDERS.PHONE) : null;

    if (!account || !identity) {
      return this.rejectWithoutComparing();
    }

    const loginChallenge = await this.claimAttemptOnLatestChallenge(account.id);

    if (!loginChallenge) {
      return this.rejectWithoutComparing();
    }

    if (!await this.encrypter.compare(code, loginChallenge.codeHash.toPrimitives())) {
      throw new Unauthorized('Invalid credentials');
    }

    await this.consume(loginChallenge);
    await this.checkIfChallengeIsStillTheLatest(loginChallenge);

    return {account, identity};
  }

  private async checkIfChallengeIsStillTheLatest (loginChallenge: LoginChallenge): Promise<void> {
    const latestChallenge = await this.loginChallengeRepository.findLatestByAccount(loginChallenge.accountId, IDENTITY_PROVIDERS.PHONE);

    if (latestChallenge?.id.toPrimitives() !== loginChallenge.id.toPrimitives()) {
      throw new Unauthorized('Invalid credentials');
    }
  }

  private async claimAttemptOnLatestChallenge (accountId: Uuid): Promise<Nullable<LoginChallenge>> {
    const maximumAttempts = this.accountConfig.getLoginChallengePolicy().toPrimitives().maximumAttempts;
    const loginChallenge = await this.loginChallengeRepository.findLatestByAccount(accountId, IDENTITY_PROVIDERS.PHONE);

    if (!loginChallenge?.isActive(new Date(), maximumAttempts)) {
      return null;
    }

    try {
      await this.loginChallengeRepository.claimAttempt(loginChallenge.id, maximumAttempts);
    } catch (error) {
      if (error instanceof Conflict) {
        return null;
      }

      throw error;
    }

    return loginChallenge;
  }

  private async consume (loginChallenge: LoginChallenge): Promise<void> {
    try {
      await this.loginChallengeRepository.consume(loginChallenge.id);
    } catch (error) {
      if (error instanceof Conflict) {
        throw new Unauthorized('Invalid credentials');
      }

      throw error;
    }
  }

  private parseCode (code: string): string {
    if (!DIGITS_ONLY_PATTERN.test(code)) {
      throw new InvalidArgument({customMessage: `code must be a string of digits for ${IDENTITY_PROVIDERS.PHONE} provider`});
    }

    return code;
  }

  private async rejectWithoutComparing (): Promise<never> {
    await this.encrypter.encrypt(TIMING_EQUALIZATION_TEXT);

    throw new Unauthorized('Invalid credentials');
  }
}
