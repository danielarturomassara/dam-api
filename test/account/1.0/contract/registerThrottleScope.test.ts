import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {LoginContractHarness} from './loginContractHarness.js';

const harness = new LoginContractHarness(43124);

beforeAll(async (): Promise<void> => harness.start());

afterAll(async (): Promise<void> => harness.stop());

beforeEach((): void => harness.reset());

describe('POST /auth/register throttle scope', (): void => {
  it('asks the throttle with the scope account.register and the policy of the module', async (): Promise<void> => {
    harness.requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 23};

    const response = await harness.post('/auth/register', {provider: 'password', providerData: {email: 'someone@example.com', password: 'correct-horse-battery'}});

    expect(response.status).toBe(429);
    expect(response.retryAfter).toBe('23');
    expect(harness.requestThrottle.consumedList).toStrictEqual([{clientAddress: '127.0.0.1', scope: 'account.register'}]);
    expect(harness.requestThrottle.policyList).toStrictEqual([{maximumRequests: 20, windowSeconds: 300}]);
    expect(harness.accountRepository.accountList).toHaveLength(0);
  });
});
