import {AccountRepository} from '@account/domain/AccountRepository.js';
import {Account} from '@account/domain/entity/Account.js';
import {IdentityPrimitives} from '@account/domain/entity/Identity.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

import {AccountRepositoryInMemory} from './AccountRepositoryInMemory.js';

export const VERIFICATION_HASH = '0b9b8d32-3c0e-4d0e-9a57-6d5c0a4f2b11';

export const VERIFICATION_LIFETIME_MILLISECONDS = 86_400_000;

export interface VerificationAccountState {
  identityCreatedAt?: Date;
  isAccountDisabled?: boolean;
  isIdentityDisabled?: boolean;
  isIdentityVerified?: boolean;
}

export const buildPasswordVerificationAccount = (email: string, state: VerificationAccountState = {}): Account => {
  const identityCreatedAt = state.identityCreatedAt ?? new Date();
  const identity: IdentityPrimitives = {
    createdAt: identityCreatedAt,
    disabledAt: state.isIdentityDisabled ? identityCreatedAt : null,
    hash: VERIFICATION_HASH,
    id: Uuid.create().toPrimitives(),
    password: 'hashed:correct-horse-battery',
    provider: IDENTITY_PROVIDERS.PASSWORD,
    updatedAt: identityCreatedAt,
    verifiedAt: state.isIdentityVerified ? identityCreatedAt : null
  };

  return Account.fromPrimitives({
    createdAt: identityCreatedAt,
    disabledAt: state.isAccountDisabled ? identityCreatedAt : null,
    id: Uuid.create().toPrimitives(),
    identities: [identity],
    primaryEmail: email,
    primaryPhone: null,
    updatedAt: identityCreatedAt
  });
};

export class AccountRepositoryRecording implements AccountRepository {
  public readonly findByEmailList: Array<string> = [];
  public nextUpdateError: Nullable<Error> = null;
  public readonly updatedAccountIdList: Array<string> = [];

  public constructor (private readonly accountRepository: AccountRepositoryInMemory = new AccountRepositoryInMemory()) {}

  public async create (account: Account): Promise<void> {
    return this.accountRepository.create(account);
  }

  public async delete (id: Uuid): Promise<void> {
    return this.accountRepository.delete(id);
  }

  public async findByEmail (email: Email): Promise<Nullable<Account>> {
    this.findByEmailList.push(email.toPrimitives());

    return this.accountRepository.findByEmail(email);
  }

  public async findById (id: Uuid): Promise<Nullable<Account>> {
    return this.accountRepository.findById(id);
  }

  public async findByPhone (phone: Phone): Promise<Nullable<Account>> {
    return this.accountRepository.findByPhone(phone);
  }

  public async update (account: Account): Promise<void> {
    if (this.nextUpdateError) {
      const updateError = this.nextUpdateError;

      this.nextUpdateError = null;

      throw updateError;
    }

    await this.accountRepository.update(account);

    this.updatedAccountIdList.push(account.id.toPrimitives());
  }
}
