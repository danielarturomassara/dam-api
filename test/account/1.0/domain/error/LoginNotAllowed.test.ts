import {LoginNotAllowed, LoginNotAllowedReason} from '@account/domain/error/LoginNotAllowed.js';
import {Forbidden} from '@core/domain/error/Forbidden.js';
import {describe, expect, it} from 'vitest';

describe('LoginNotAllowed', (): void => {
  it.each<LoginNotAllowedReason>(['account disabled', 'identity disabled', 'identity not verified'])('carries the reason "%s" in its message', (reason: LoginNotAllowedReason): void => {
    const error = new LoginNotAllowed(reason);

    expect(error.message).toBe(`Login not allowed. Reason: ${reason}.`);
    expect(error.reason).toBe(reason);
  });

  it('is a Forbidden named after itself', (): void => {
    const error = new LoginNotAllowed('account disabled');

    expect(error).toBeInstanceOf(Forbidden);
    expect(error.name).toBe('LoginNotAllowed');
  });
});
