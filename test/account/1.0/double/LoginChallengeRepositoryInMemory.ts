import {LoginChallenge, LoginChallengePrimitives} from '@account/domain/entity/LoginChallenge.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {LoginChallengeRepository} from '@account/domain/LoginChallengeRepository.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export class LoginChallengeRepositoryInMemory implements LoginChallengeRepository {
  public readonly challengeList: Array<LoginChallengePrimitives> = [];
  public nextCreateError: Nullable<Error> = null;

  public async claimAttempt (id: Uuid, maximumAttempts: number): Promise<void> {
    const storedChallenge = this.findStored(id);

    if (!storedChallenge || !LoginChallenge.fromPrimitives(storedChallenge).isActive(new Date(), maximumAttempts)) {
      throw new Conflict('Login challenge attempt');
    }

    storedChallenge.attemptCount += 1;
  }

  public async consume (id: Uuid): Promise<void> {
    const storedChallenge = this.findStored(id);

    if (!storedChallenge || storedChallenge.consumedAt !== null) {
      throw new Conflict('Login challenge is already consumed');
    }

    storedChallenge.consumedAt = new Date();
  }

  public async create (loginChallenge: LoginChallenge): Promise<void> {
    const primitives = loginChallenge.toPrimitives();
    const supersedesTheSame = (storedChallenge: LoginChallengePrimitives): boolean => {
      return storedChallenge.accountId === primitives.accountId &&
        storedChallenge.provider === primitives.provider &&
        storedChallenge.supersededChallengeId === primitives.supersededChallengeId;
    };

    if (this.nextCreateError) {
      throw this.nextCreateError;
    }

    if (this.challengeList.some(supersedesTheSame)) {
      throw new Conflict('Login challenge was already superseded');
    }

    this.challengeList.push(primitives);
  }

  public async findLatestByAccount (accountId: Uuid, provider: IDENTITY_PROVIDERS): Promise<Nullable<LoginChallenge>> {
    const latestChallenge = this.challengeList
      .filter((challenge) => challenge.accountId === accountId.toPrimitives() && challenge.provider === provider)
      .toSorted((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
      .at(0);

    return latestChallenge ? LoginChallenge.fromPrimitives({...latestChallenge}) : null;
  }

  private findStored (id: Uuid): Nullable<LoginChallengePrimitives> {
    return this.challengeList.find((challenge) => challenge.id === id.toPrimitives()) ?? null;
  }
}
