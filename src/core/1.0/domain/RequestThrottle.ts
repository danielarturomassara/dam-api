import {ThrottleScope} from '@core/domain/type/ThrottleScope.js';
import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';

export interface RequestThrottle {
  consume (scope: ThrottleScope, clientAddress: string, throttlePolicy: ThrottlePolicy): Promise<ThrottleDecision>;
}

export interface ThrottleDecision {
  isAllowed: boolean;
  retryAfterSeconds: number;
}

export const REQUEST_THROTTLE = Symbol.for('RequestThrottle');
