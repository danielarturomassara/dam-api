import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {ThrottlePolicy} from '@core/domain/valueObject/ThrottlePolicy.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

const notPositiveInteger = fc.double().filter((value: number): boolean => !Number.isInteger(value) || value < 1);

describe('ThrottlePolicy', (): void => {
  it('accepts and round-trips every pair of positive integers', (): void => {
    fc.assert(fc.property(fc.integer({min: 1}), fc.integer({min: 1}), (maximumRequests: number, windowSeconds: number): void => {
      expect(ThrottlePolicy.fromPrimitives({maximumRequests, windowSeconds}).toPrimitives()).toStrictEqual({maximumRequests, windowSeconds});
    }));
  });

  it('rejects every maximum that is not a positive integer', (): void => {
    fc.assert(fc.property(notPositiveInteger, (maximumRequests: number): void => {
      expect((): unknown => ThrottlePolicy.fromPrimitives({maximumRequests, windowSeconds: 300}))
        .toThrow(new InvalidArgument({customMessage: 'maximumRequests must be a positive integer'}));
    }));
  });

  it('rejects every window that is not a positive integer', (): void => {
    fc.assert(fc.property(notPositiveInteger, (windowSeconds: number): void => {
      expect((): unknown => ThrottlePolicy.fromPrimitives({maximumRequests: 20, windowSeconds}))
        .toThrow(new InvalidArgument({customMessage: 'windowSeconds must be a positive integer'}));
    }));
  });
});
