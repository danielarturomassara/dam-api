import {LoginChallenge} from '@account/domain/entity/LoginChallenge.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface LoginChallengeRepository {
  claimAttempt (id: Uuid, maximumAttempts: number): Promise<void>;
  consume (id: Uuid): Promise<void>;
  create (loginChallenge: LoginChallenge): Promise<void>;
  findLatestByAccount (accountId: Uuid, provider: IDENTITY_PROVIDERS): Promise<Nullable<LoginChallenge>>;
}

export const LOGIN_CHALLENGE_REPOSITORY = Symbol.for('LoginChallengeRepository');
