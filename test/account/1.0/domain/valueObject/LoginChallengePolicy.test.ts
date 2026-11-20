import {LoginChallengePolicy} from '@account/domain/valueObject/LoginChallengePolicy.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

const validPolicy = fc.record({lifetimeSeconds: fc.integer({max: 86_400, min: 30}), maximumAttempts: fc.integer({max: 100, min: 1})})
  .chain((policy) => fc.integer({max: policy.lifetimeSeconds, min: 0}).map((resendIntervalSeconds: number) => ({...policy, resendIntervalSeconds})));

describe('LoginChallengePolicy', (): void => {
  it('accepts and round-trips every policy inside the ranges', (): void => {
    fc.assert(fc.property(validPolicy, (policy): void => {
      expect(LoginChallengePolicy.fromPrimitives(policy).toPrimitives()).toStrictEqual(policy);
    }));
  });

  it('rejects every lifetime below 30 seconds', (): void => {
    fc.assert(fc.property(fc.integer({max: 29}), (lifetimeSeconds: number): void => {
      expect((): unknown => LoginChallengePolicy.fromPrimitives({lifetimeSeconds, maximumAttempts: 5, resendIntervalSeconds: 0}))
        .toThrow(new InvalidArgument({customMessage: 'lifetimeSeconds must be an integer of at least 30'}));
    }));
  });

  it('rejects every maximum of attempts below 1', (): void => {
    fc.assert(fc.property(fc.integer({max: 0}), (maximumAttempts: number): void => {
      expect((): unknown => LoginChallengePolicy.fromPrimitives({lifetimeSeconds: 300, maximumAttempts, resendIntervalSeconds: 60}))
        .toThrow(new InvalidArgument({customMessage: 'maximumAttempts must be an integer of at least 1'}));
    }));
  });

  it('rejects every negative resend interval', (): void => {
    fc.assert(fc.property(fc.integer({max: -1}), (resendIntervalSeconds: number): void => {
      expect((): unknown => LoginChallengePolicy.fromPrimitives({lifetimeSeconds: 300, maximumAttempts: 5, resendIntervalSeconds}))
        .toThrow(new InvalidArgument({customMessage: 'resendIntervalSeconds must be an integer of at least 0'}));
    }));
  });

  it('rejects a resend interval longer than the lifetime', (): void => {
    expect((): unknown => LoginChallengePolicy.fromPrimitives({lifetimeSeconds: 300, maximumAttempts: 5, resendIntervalSeconds: 301}))
      .toThrow(new InvalidArgument({customMessage: 'resendIntervalSeconds must be at most lifetimeSeconds'}));
  });

  it.each(['lifetimeSeconds', 'maximumAttempts', 'resendIntervalSeconds'])('rejects a fractional %s', (fieldName: string): void => {
    const validPrimitives = {lifetimeSeconds: 300, maximumAttempts: 5, resendIntervalSeconds: 60};

    expect((): unknown => LoginChallengePolicy.fromPrimitives({...validPrimitives, [fieldName]: 45.5}))
      .toThrow(new InvalidArgument({customMessage: `${fieldName} must be an integer of at least ${Reflect.get({lifetimeSeconds: 30, maximumAttempts: 1, resendIntervalSeconds: 0}, fieldName)}`}));
  });
});
