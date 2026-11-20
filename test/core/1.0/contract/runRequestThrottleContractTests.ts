import {RequestThrottle, ThrottleDecision} from '@core/domain/RequestThrottle.js';
import {ThrottleScope} from '@core/domain/type/ThrottleScope.js';
import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';
import {describe, expect, it} from 'vitest';

export interface RequestThrottleContractHarness {
  advanceTime (milliseconds: number): void;
  buildThrottle (): RequestThrottle;
}

const WINDOW_SECONDS = 60;

const MAXIMUM_REQUESTS = 3;

const POLICY = ThrottlePolicy.fromPrimitives({maximumRequests: MAXIMUM_REQUESTS, windowSeconds: WINDOW_SECONDS});

const SCOPE: ThrottleScope = 'shop.checkout';

const OTHER_SCOPE: ThrottleScope = 'shop.search';

const SAME_NAME_IN_ANOTHER_MODULE: ThrottleScope = 'billing.checkout';

const ADDRESS = '192.0.2.1';

const ALLOWED = {isAllowed: true, retryAfterSeconds: 0};

const consume = async (throttle: RequestThrottle, scope: ThrottleScope = SCOPE, clientAddress: string = ADDRESS): Promise<ThrottleDecision> => {
  return throttle.consume(scope, clientAddress, POLICY);
};

const consumeTimes = async (throttle: RequestThrottle, times: number): Promise<void> => {
  for (let requestIndex = 0; requestIndex < times; requestIndex += 1) {
    await consume(throttle);
  }
};

export const runRequestThrottleContractTests = (adapterName: string, harness: RequestThrottleContractHarness): void => {
  describe(`RequestThrottle contract — ${adapterName}`, (): void => {
    it('allows the maximum of requests of the policy inside one window', async (): Promise<void> => {
      const throttle = harness.buildThrottle();

      for (let requestIndex = 0; requestIndex < MAXIMUM_REQUESTS; requestIndex += 1) {
        expect(await consume(throttle)).toStrictEqual(ALLOWED);
      }
    });

    it('refuses the request beyond the maximum with the whole seconds until the window ends', async (): Promise<void> => {
      const throttle = harness.buildThrottle();

      await consumeTimes(throttle, MAXIMUM_REQUESTS);
      harness.advanceTime(20_500);

      expect(await consume(throttle)).toStrictEqual({isAllowed: false, retryAfterSeconds: 40});
    });

    it('answers 1 second when the window is about to end', async (): Promise<void> => {
      const throttle = harness.buildThrottle();

      await consumeTimes(throttle, MAXIMUM_REQUESTS);
      harness.advanceTime(WINDOW_SECONDS * 1000 - 1);

      expect(await consume(throttle)).toStrictEqual({isAllowed: false, retryAfterSeconds: 1});
    });

    it('keeps refusing for the whole window, however many requests arrive', async (): Promise<void> => {
      const throttle = harness.buildThrottle();

      await consumeTimes(throttle, MAXIMUM_REQUESTS + 5);
      harness.advanceTime(30_000);

      expect(await consume(throttle)).toStrictEqual({isAllowed: false, retryAfterSeconds: 30});
    });

    it('starts a new window with the first request after the window ends', async (): Promise<void> => {
      const throttle = harness.buildThrottle();

      await consumeTimes(throttle, MAXIMUM_REQUESTS + 1);
      harness.advanceTime(WINDOW_SECONDS * 1000);

      expect(await consume(throttle)).toStrictEqual(ALLOWED);

      await consumeTimes(throttle, MAXIMUM_REQUESTS - 1);

      expect(await consume(throttle)).toStrictEqual({isAllowed: false, retryAfterSeconds: WINDOW_SECONDS});
    });

    it('measures the window from its first request, not from the latest one', async (): Promise<void> => {
      const throttle = harness.buildThrottle();

      await consume(throttle);
      harness.advanceTime(50_000);
      await consumeTimes(throttle, MAXIMUM_REQUESTS - 1);

      expect(await consume(throttle)).toStrictEqual({isAllowed: false, retryAfterSeconds: 10});
    });

    it('counts each scope on its own, and the same name in two modules as two scopes', async (): Promise<void> => {
      const throttle = harness.buildThrottle();

      await consumeTimes(throttle, MAXIMUM_REQUESTS + 1);

      expect(await consume(throttle, OTHER_SCOPE)).toStrictEqual(ALLOWED);
      expect(await consume(throttle, SAME_NAME_IN_ANOTHER_MODULE)).toStrictEqual(ALLOWED);
    });

    it('counts each client address on its own', async (): Promise<void> => {
      const throttle = harness.buildThrottle();

      await consumeTimes(throttle, MAXIMUM_REQUESTS + 1);

      expect(await consume(throttle, SCOPE, '192.0.2.2')).toStrictEqual(ALLOWED);
    });

    it('applies to each scope the policy its requests carry', async (): Promise<void> => {
      const throttle = harness.buildThrottle();
      const strictPolicy = ThrottlePolicy.fromPrimitives({maximumRequests: 1, windowSeconds: 10});

      await throttle.consume(OTHER_SCOPE, ADDRESS, strictPolicy);
      await consume(throttle);

      expect(await throttle.consume(OTHER_SCOPE, ADDRESS, strictPolicy)).toStrictEqual({isAllowed: false, retryAfterSeconds: 10});
      expect(await consume(throttle)).toStrictEqual(ALLOWED);

      harness.advanceTime(10_000);

      expect(await throttle.consume(OTHER_SCOPE, ADDRESS, strictPolicy)).toStrictEqual(ALLOWED);
    });

    it('never shares one count between concurrent requests', async (): Promise<void> => {
      const throttle = harness.buildThrottle();
      const decisionList = await Promise.all(Array.from({length: 10}, async (): Promise<ThrottleDecision> => consume(throttle)));

      expect(decisionList.filter((decision) => decision.isAllowed)).toHaveLength(MAXIMUM_REQUESTS);
    });
  });
};
