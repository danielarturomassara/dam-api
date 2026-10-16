import {Account} from '@account/domain/entity/Account.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface AccountRepository {
  create (account: Account): Promise<void>;
  delete (id: Uuid): Promise<void>;
  findByEmail (email: Email): Promise<Nullable<Account>>;
  findById (id: Uuid): Promise<Nullable<Account>>;
  findByPhone (phone: Phone): Promise<Nullable<Account>>;
  update (account: Account): Promise<void>;
}

export const ACCOUNT_REPOSITORY = Symbol.for('AccountRepository');
