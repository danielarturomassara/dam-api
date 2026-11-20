import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {TimestampedEntity, TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface CreateLoginChallengeInput extends Pick<LoginChallengePrimitives, 'accountId' | 'codeHash' | 'provider'> {
  lifetimeSeconds: number;
  supersededChallenge: Nullable<LoginChallenge>;
}

export interface LoginChallengePrimitives extends TimestampedEntityPrimitives {
  accountId: string;
  attemptCount: number;
  codeHash: string;
  consumedAt: Nullable<Date>;
  expiresAt: Date;
  provider: IDENTITY_PROVIDERS;
  supersededChallengeId: Nullable<string>;
}

const MILLISECONDS_PER_SECOND = 1000;

export class LoginChallenge extends TimestampedEntity {
  public readonly accountId: Uuid;
  public readonly attemptCount: number;
  public readonly codeHash: TrimmedString;
  public readonly consumedAt: Nullable<Date>;
  public readonly expiresAt: Date;
  public readonly provider: IDENTITY_PROVIDERS;
  public readonly supersededChallengeId: Nullable<Uuid>;

  public static create ({lifetimeSeconds, supersededChallenge, ...primitives}: CreateLoginChallengeInput): LoginChallenge {
    const timestampedEntity = TimestampedEntity.buildNew();
    const createdAt = supersededChallenge ? supersededChallenge.buildSuccessorCreationDate(timestampedEntity.createdAt) : timestampedEntity.createdAt;

    return new LoginChallenge({
      ...timestampedEntity,
      ...primitives,
      attemptCount: 0,
      consumedAt: null,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + lifetimeSeconds * MILLISECONDS_PER_SECOND),
      supersededChallengeId: supersededChallenge ? supersededChallenge.id.toPrimitives() : null,
      updatedAt: createdAt
    });
  }

  public static fromPrimitives (primitives: LoginChallengePrimitives): LoginChallenge {
    return new LoginChallenge(primitives);
  }

  public isActive (now: Date, maximumAttempts: number): boolean {
    return !this.isConsumed() && now < this.expiresAt && this.attemptCount < maximumAttempts;
  }

  public isConsumed (): boolean {
    return this.consumedAt !== null;
  }

  public override toPrimitives (): LoginChallengePrimitives {
    return {
      ...super.toPrimitives(),
      accountId: this.accountId.toPrimitives(),
      attemptCount: this.attemptCount,
      codeHash: this.codeHash.toPrimitives(),
      consumedAt: this.consumedAt,
      expiresAt: this.expiresAt,
      provider: this.provider,
      supersededChallengeId: this.supersededChallengeId ? this.supersededChallengeId.toPrimitives() : null
    };
  }

  public wasCreatedWithin (seconds: number, now: Date): boolean {
    return now.getTime() - this.createdAt.getTime() < seconds * MILLISECONDS_PER_SECOND;
  }

  private constructor (primitives: LoginChallengePrimitives) {
    super(primitives);

    this.accountId = Uuid.fromPrimitives(primitives.accountId);
    this.attemptCount = primitives.attemptCount;
    this.codeHash = TrimmedString.fromPrimitives(primitives.codeHash);
    this.consumedAt = primitives.consumedAt;
    this.expiresAt = primitives.expiresAt;
    this.provider = primitives.provider;
    this.supersededChallengeId = primitives.supersededChallengeId === null ? null : Uuid.fromPrimitives(primitives.supersededChallengeId);

    this.ensureAttemptCountIsValid();
  }

  private buildSuccessorCreationDate (now: Date): Date {
    return new Date(Math.max(now.getTime(), this.createdAt.getTime() + 1));
  }

  private ensureAttemptCountIsValid (): void {
    if (!Number.isInteger(this.attemptCount) || this.attemptCount < 0) {
      throw new InvalidArgument({customMessage: 'attemptCount must be a non-negative integer'});
    }
  }
}
