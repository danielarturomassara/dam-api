import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

export interface ThrottlePolicyPrimitives {
  maximumRequests: number;
  windowSeconds: number;
}

export class ThrottlePolicy {
  private readonly maximumRequests: number;
  private readonly windowSeconds: number;

  public static fromPrimitives (primitives: ThrottlePolicyPrimitives): ThrottlePolicy {
    return new ThrottlePolicy(primitives);
  }

  public toPrimitives (): ThrottlePolicyPrimitives {
    return {
      maximumRequests: this.maximumRequests,
      windowSeconds: this.windowSeconds
    };
  }

  private constructor (primitives: ThrottlePolicyPrimitives) {
    this.maximumRequests = primitives.maximumRequests;
    this.windowSeconds = primitives.windowSeconds;

    this.ensureValuesArePositiveIntegers();
  }

  private ensureValuesArePositiveIntegers (): void {
    for (const [valueName, value] of Object.entries(this.toPrimitives())) {
      if (!Number.isInteger(value) || value < 1) {
        throw new InvalidArgument({customMessage: `${valueName} must be a positive integer`});
      }
    }
  }
}
