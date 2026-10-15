import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {Conflict} from '@core/domain/error/Conflict.js';
import {describe, expect, it} from 'vitest';

describe('DuplicateContact', (): void => {
  it.each([['email', 'Conflict: email.'], ['phone', 'Conflict: phone.']])('is a Conflict on %s', (resource: string, expectedMessage: string): void => {
    const error = new DuplicateContact(resource as 'email' | 'phone');

    expect(error).toBeInstanceOf(Conflict);
    expect(error.message).toBe(expectedMessage);
  });
});
