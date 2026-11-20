import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';
import {RequestThrottleInMemory} from '@core/infrastructure/RequestThrottleInMemory.js';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {runRequestThrottleContractTests} from '../contract/runRequestThrottleContractTests.js';

const WINDOW_SECONDS = 60;

const WINDOW_MILLISECONDS = WINDOW_SECONDS * 1000;

const POLICY = ThrottlePolicy.fromPrimitives({maximumRequests: 3, windowSeconds: WINDOW_SECONDS});

const LONG_POLICY = ThrottlePolicy.fromPrimitives({maximumRequests: 3, windowSeconds: WINDOW_SECONDS * 10});

beforeEach((): void => {
  vi.useFakeTimers({toFake: ['Date', 'performance']});
});

afterEach((): void => {
  vi.useRealTimers();
});

runRequestThrottleContractTests('RequestThrottleInMemory', {
  advanceTime: (milliseconds: number): void => {
    vi.advanceTimersByTime(milliseconds);
  },
  buildThrottle: (): RequestThrottleInMemory => new RequestThrottleInMemory()
});

describe('RequestThrottleInMemory', (): void => {
  it('discards every window that has ended, whenever each one started', async (): Promise<void> => {
    const throttle = new RequestThrottleInMemory();

    await throttle.consume('shop.checkout', '192.0.2.1', POLICY);
    vi.advanceTimersByTime(1);
    await throttle.consume('shop.checkout', '192.0.2.2', POLICY);
    await throttle.consume('shop.search', '192.0.2.2', POLICY);
    vi.advanceTimersByTime(30_000);
    await throttle.consume('shop.checkout', '192.0.2.3', POLICY);

    expect(throttle.countOpenWindows()).toBe(4);

    vi.advanceTimersByTime(WINDOW_MILLISECONDS - 30_001);
    await throttle.consume('shop.checkout', '192.0.2.4', POLICY);

    expect(throttle.countOpenWindows()).toBe(4);

    vi.advanceTimersByTime(1);
    await throttle.consume('shop.checkout', '192.0.2.4', POLICY);

    expect(throttle.countOpenWindows()).toBe(2);

    vi.advanceTimersByTime(WINDOW_MILLISECONDS);
    await throttle.consume('shop.checkout', '192.0.2.5', POLICY);

    expect(throttle.countOpenWindows()).toBe(1);
  });

  it('discards the ended windows of a scope while another scope holds a longer one', async (): Promise<void> => {
    const throttle = new RequestThrottleInMemory();

    await throttle.consume('shop.search', '192.0.2.1', LONG_POLICY);
    await throttle.consume('shop.checkout', '192.0.2.1', POLICY);
    await throttle.consume('shop.checkout', '192.0.2.2', POLICY);

    vi.advanceTimersByTime(WINDOW_MILLISECONDS);
    await throttle.consume('shop.checkout', '192.0.2.3', POLICY);

    expect(throttle.countOpenWindows()).toBe(2);
  });

  it('never counts against a window that has ended, even one a longer window hides from the discard', async (): Promise<void> => {
    const throttle = new RequestThrottleInMemory();
    const onePerWindow = ThrottlePolicy.fromPrimitives({maximumRequests: 1, windowSeconds: WINDOW_SECONDS});

    await throttle.consume('shop.checkout', '192.0.2.1', LONG_POLICY);
    await throttle.consume('shop.checkout', '192.0.2.2', onePerWindow);
    vi.advanceTimersByTime(WINDOW_MILLISECONDS);

    expect(await throttle.consume('shop.checkout', '192.0.2.2', onePerWindow)).toStrictEqual({isAllowed: true, retryAfterSeconds: 0});
  });

  it('holds one window per scope and client address, however many requests arrive', async (): Promise<void> => {
    const throttle = new RequestThrottleInMemory();

    for (let requestIndex = 0; requestIndex < 50; requestIndex += 1) {
      await throttle.consume('shop.checkout', '192.0.2.1', POLICY);
    }

    expect(throttle.countOpenWindows()).toBe(1);
  });

  it('does not depend on the wall clock: a clock set back neither extends a window nor its Retry-After', async (): Promise<void> => {
    const throttle = new RequestThrottleInMemory();
    const onePerWindow = ThrottlePolicy.fromPrimitives({maximumRequests: 1, windowSeconds: WINDOW_SECONDS});

    await throttle.consume('shop.checkout', '192.0.2.1', onePerWindow);
    vi.advanceTimersByTime(10_000);
    vi.setSystemTime(Date.now() - 3_600_000);

    expect(await throttle.consume('shop.checkout', '192.0.2.1', onePerWindow)).toStrictEqual({isAllowed: false, retryAfterSeconds: 50});
  });
});
