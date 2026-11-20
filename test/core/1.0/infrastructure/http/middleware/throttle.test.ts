import {ServerError} from '@core/domain/error/ServerError.js';
import {TooManyRequests} from '@core/domain/error/TooManyRequests.js';
import {ThrottleScope} from '@core/domain/type/ThrottleScope.js';
import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';
import {throttle} from '@core/infrastructure/http/middleware/throttle.js';
import {Request, Response} from 'express';
import {beforeEach, describe, expect, it} from 'vitest';

import {RequestThrottleScripted} from '../../../double/RequestThrottleScripted.js';
import {ResponseRecorder} from '../../../double/ResponseRecorder.js';

const POLICY = ThrottlePolicy.fromPrimitives({maximumRequests: 7, windowSeconds: 90});

let requestThrottle: RequestThrottleScripted;

interface MiddlewareOutcome {
  nextArgumentList: Array<unknown>;
  response: ResponseRecorder;
}

const run = async (scope: ThrottleScope, clientAddress: string | undefined): Promise<MiddlewareOutcome> => {
  const response = new ResponseRecorder();
  const nextArgumentList: Array<unknown> = [];

  await throttle(requestThrottle, scope, POLICY)({ip: clientAddress} as Request, response as unknown as Response, (...nextArguments: Array<unknown>): void => {
    nextArgumentList.push(nextArguments);
  });

  return {nextArgumentList, response};
};

beforeEach((): void => {
  requestThrottle = new RequestThrottleScripted();
});

describe('throttle middleware', (): void => {
  it('lets an allowed request through without touching the response', async (): Promise<void> => {
    const {nextArgumentList, response} = await run('shop.checkout', '192.0.2.1');

    expect(nextArgumentList).toStrictEqual([[]]);
    expect(response.headers).toStrictEqual({});
    expect(response.statusCode).toBeNull();
    expect(response.isEnded).toBe(false);
  });

  it('asks the throttle with its scope, the normalized client address and its policy', async (): Promise<void> => {
    await run('shop.search', '2001:db8:1:2:aaaa:bbbb:cccc:dddd');
    await run('shop.checkout', '::ffff:192.0.2.9');

    expect(requestThrottle.consumedList).toStrictEqual([
      {clientAddress: '2001:db8:1:2::/64', scope: 'shop.search'},
      {clientAddress: '192.0.2.9', scope: 'shop.checkout'}
    ]);
    expect(requestThrottle.policyList).toStrictEqual([POLICY.toPrimitives(), POLICY.toPrimitives()]);
  });

  it('forwards TooManyRequests with the Retry-After header for a refused request', async (): Promise<void> => {
    requestThrottle.nextDecision = {isAllowed: false, retryAfterSeconds: 42};

    const {nextArgumentList, response} = await run('shop.checkout', '192.0.2.1');

    expect(nextArgumentList).toStrictEqual([[new TooManyRequests()]]);
    expect(response.headers).toStrictEqual({'Retry-After': '42'});
    expect(response.isEnded).toBe(false);
  });

  it('forwards a failure of the throttle to the error middleware', async (): Promise<void> => {
    requestThrottle.nextError = new Error('the store is down');

    const {nextArgumentList} = await run('shop.checkout', '192.0.2.1');

    expect(nextArgumentList).toStrictEqual([[new Error('the store is down')]]);
  });

  it('fails loudly when the request has no client address', async (): Promise<void> => {
    const {nextArgumentList} = await run('shop.checkout', undefined);

    expect(nextArgumentList).toStrictEqual([[new ServerError('The client address of the request is not available.')]]);
    expect(requestThrottle.consumedList).toHaveLength(0);
  });
});
