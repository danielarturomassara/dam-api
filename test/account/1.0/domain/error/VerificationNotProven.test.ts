import {VerificationNotProven} from '@account/domain/error/VerificationNotProven.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {describe, expect, it} from 'vitest';

describe('VerificationNotProven', (): void => {
  it('is an InvalidArgument carrying the one message of every unproven verification', (): void => {
    const error = new VerificationNotProven();

    expect(error).toBeInstanceOf(InvalidArgument);
    expect(error.message).toBe('Invalid or expired verification');
    expect(error.name).toBe('VerificationNotProven');
  });
});
