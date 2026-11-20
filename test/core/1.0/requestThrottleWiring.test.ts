import {REQUEST_THROTTLE, RequestThrottle} from '@core/domain/RequestThrottle.js';
import {RequestThrottleInMemory} from '@core/infrastructure/RequestThrottleInMemory.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {describe, expect, it} from 'vitest';

describe('core RequestThrottle wiring', (): void => {
  it('binds the port to RequestThrottleInMemory', (): void => {
    expect(dependencyContainer.get<RequestThrottle>(REQUEST_THROTTLE)).toBeInstanceOf(RequestThrottleInMemory);
  });

  it('resolves the same instance every time', (): void => {
    expect(dependencyContainer.get<RequestThrottle>(REQUEST_THROTTLE)).toBe(dependencyContainer.get<RequestThrottle>(REQUEST_THROTTLE));
  });
});
