import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

export interface LoginChallengePolicyPrimitives {
  lifetimeSeconds: number;
  maximumAttempts: number;
  resendIntervalSeconds: number;
}

const MINIMUM_BY_FIELD_NAME = {
  lifetimeSeconds: 30,
  maximumAttempts: 1,
  resendIntervalSeconds: 0
} satisfies Record<keyof LoginChallengePolicyPrimitives, number>;

export class LoginChallengePolicy {
  private readonly lifetimeSeconds: number;
  private readonly maximumAttempts: number;
  private readonly resendIntervalSeconds: number;

  public static fromPrimitives (primitives: LoginChallengePolicyPrimitives): LoginChallengePolicy {
    return new LoginChallengePolicy(primitives);
  }

  public toPrimitives (): LoginChallengePolicyPrimitives {
    return {
      lifetimeSeconds: this.lifetimeSeconds,
      maximumAttempts: this.maximumAttempts,
      resendIntervalSeconds: this.resendIntervalSeconds
    };
  }

  private constructor (primitives: LoginChallengePolicyPrimitives) {
    this.lifetimeSeconds = primitives.lifetimeSeconds;
    this.maximumAttempts = primitives.maximumAttempts;
    this.resendIntervalSeconds = primitives.resendIntervalSeconds;

    this.ensureValuesAreIntegersInRange();
    this.ensureResendIntervalFitsInLifetime();
  }

  private ensureResendIntervalFitsInLifetime (): void {
    if (this.resendIntervalSeconds > this.lifetimeSeconds) {
      throw new InvalidArgument({customMessage: 'resendIntervalSeconds must be at most lifetimeSeconds'});
    }
  }

  private ensureValuesAreIntegersInRange (): void {
    for (const [fieldName, minimum] of Object.entries(MINIMUM_BY_FIELD_NAME)) {
      const value: unknown = Reflect.get(this, fieldName);

      if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
        throw new InvalidArgument({customMessage: `${fieldName} must be an integer of at least ${minimum}`});
      }
    }
  }
}
