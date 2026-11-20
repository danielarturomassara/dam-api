import {RequestThrottle, ThrottleDecision} from '@core/domain/RequestThrottle.js';
import {ThrottleScope} from '@core/domain/type/ThrottleScope.js';
import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';
import {injectable} from 'inversify';

interface ThrottleWindow {
  endsAtMilliseconds: number;
  requestCount: number;
}

type WindowByClientAddress = Map<string, ThrottleWindow>;

const MILLISECONDS_PER_SECOND = 1000;

@injectable()
export class RequestThrottleInMemory implements RequestThrottle {
  private readonly windowsByScope: Map<ThrottleScope, WindowByClientAddress> = new Map<ThrottleScope, WindowByClientAddress>();

  public async consume (scope: ThrottleScope, clientAddress: string, throttlePolicy: ThrottlePolicy): Promise<ThrottleDecision> {
    const {maximumRequests, windowSeconds} = throttlePolicy.toPrimitives();
    const nowMilliseconds = performance.now();
    this.discardEndedWindows(nowMilliseconds);

    const windowByClientAddress = this.getWindowsOfScope(scope);
    const knownWindow = windowByClientAddress.get(clientAddress);

    if (!knownWindow || knownWindow.endsAtMilliseconds <= nowMilliseconds) {
      windowByClientAddress.delete(clientAddress);
      windowByClientAddress.set(clientAddress, {endsAtMilliseconds: nowMilliseconds + windowSeconds * MILLISECONDS_PER_SECOND, requestCount: 1});

      return {isAllowed: true, retryAfterSeconds: 0};
    }

    if (knownWindow.requestCount >= maximumRequests) {
      return {isAllowed: false, retryAfterSeconds: Math.ceil((knownWindow.endsAtMilliseconds - nowMilliseconds) / MILLISECONDS_PER_SECOND)};
    }

    knownWindow.requestCount += 1;

    return {isAllowed: true, retryAfterSeconds: 0};
  }

  public countOpenWindows (): number {
    let windowCount = 0;

    for (const windowByClientAddress of this.windowsByScope.values()) {
      windowCount += windowByClientAddress.size;
    }

    return windowCount;
  }

  private discardEndedWindows (nowMilliseconds: number): void {
    for (const [scope, windowByClientAddress] of this.windowsByScope) {
      this.discardEndedWindowsOfScope(windowByClientAddress, nowMilliseconds);

      if (windowByClientAddress.size === 0) {
        this.windowsByScope.delete(scope);
      }
    }
  }

  private discardEndedWindowsOfScope (windowByClientAddress: WindowByClientAddress, nowMilliseconds: number): void {
    for (const [clientAddress, throttleWindow] of windowByClientAddress) {
      if (throttleWindow.endsAtMilliseconds > nowMilliseconds) {
        return;
      }

      windowByClientAddress.delete(clientAddress);
    }
  }

  private getWindowsOfScope (scope: ThrottleScope): WindowByClientAddress {
    const windowByClientAddress = this.windowsByScope.get(scope) ?? new Map<string, ThrottleWindow>();

    this.windowsByScope.set(scope, windowByClientAddress);

    return windowByClientAddress;
  }
}
