import {RequestThrottle, ThrottleDecision} from '@core/domain/RequestThrottle.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {ThrottleScope} from '@core/domain/type/ThrottleScope.js';
import {ThrottlePolicy, ThrottlePolicyPrimitives} from '@core/domain/valueObject/ThrottlePolicy.js';

export class RequestThrottleScripted implements RequestThrottle {
  public readonly consumedList: Array<{clientAddress: string; scope: ThrottleScope}> = [];
  public nextDecision: ThrottleDecision = {isAllowed: true, retryAfterSeconds: 0};
  public nextError: Nullable<Error> = null;
  public readonly policyList: Array<ThrottlePolicyPrimitives> = [];

  public async consume (scope: ThrottleScope, clientAddress: string, throttlePolicy: ThrottlePolicy): Promise<ThrottleDecision> {
    this.consumedList.push({clientAddress, scope});
    this.policyList.push(throttlePolicy.toPrimitives());

    if (this.nextError) {
      throw this.nextError;
    }

    return this.nextDecision;
  }
}
