import {AccountRepository} from '@account/domain/AccountRepository.js';
import {Account} from '@account/domain/entity/Account.js';
import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export class AccountRepositoryInMemory implements AccountRepository {
  public readonly accountList: Array<Account> = [];
  public nextCreateError: Nullable<Error> = null;

  public async create (account: Account): Promise<void> {
    if (this.nextCreateError) {
      const createError = this.nextCreateError;

      this.nextCreateError = null;

      throw createError;
    }

    this.ensureContactsAreUnique(account);

    this.accountList.push(account);
  }

  public async delete (id: Uuid): Promise<void> {
    const accountIndex = this.accountList.findIndex((account) => account.id.toPrimitives() === id.toPrimitives());

    if (accountIndex >= 0) {
      this.accountList.splice(accountIndex, 1);
    }
  }

  public async findByEmail (email: Email): Promise<Nullable<Account>> {
    const emailString = email.toPrimitives();

    return this.accountList.find((account) => this.getContactEmails(account).includes(emailString)) ?? null;
  }

  public async findById (id: Uuid): Promise<Nullable<Account>> {
    return this.accountList.find((account) => account.id.toPrimitives() === id.toPrimitives()) ?? null;
  }

  public async findByPhone (phone: Phone): Promise<Nullable<Account>> {
    const phoneString = phone.toPrimitives();

    return this.accountList.find((account) => account.toPrimitives().primaryPhone === phoneString) ?? null;
  }

  public async update (account: Account): Promise<void> {
    const isStored = this.accountList.some((storedAccount) => storedAccount.id.toPrimitives() === account.id.toPrimitives());

    if (!isStored) {
      throw new NotFound('Account');
    }

    this.ensureContactsAreUnique(account);

    await this.delete(account.id);

    this.accountList.push(account);
  }

  private ensureContactsAreUnique (account: Account): void {
    const emailList = this.getContactEmails(account);
    const phone = account.toPrimitives().primaryPhone;

    for (const storedAccount of this.accountList) {
      if (storedAccount.id.toPrimitives() === account.id.toPrimitives()) {
        continue;
      }

      if (this.getContactEmails(storedAccount).some((storedEmail) => emailList.includes(storedEmail))) {
        throw new DuplicateContact('email');
      }

      if (phone !== null && storedAccount.toPrimitives().primaryPhone === phone) {
        throw new DuplicateContact('phone');
      }
    }
  }

  private getContactEmails (account: Account): Array<string> {
    const primitives = account.toPrimitives();
    const identityEmails = primitives.identities
      .map((identity) => identity.email)
      .filter((identityEmail): identityEmail is string => typeof identityEmail === 'string');

    return primitives.primaryEmail === null ? identityEmails : [primitives.primaryEmail, ...identityEmails];
  }
}
