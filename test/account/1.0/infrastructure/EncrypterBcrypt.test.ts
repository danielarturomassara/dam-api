import {EncrypterBcrypt} from '@account/infrastructure/EncrypterBcrypt.js';
import {describe, expect, it} from 'vitest';

describe('EncrypterBcrypt', (): void => {
  it('produces a bcrypt hash that compares true only against the original text', async (): Promise<void> => {
    const encrypter = new EncrypterBcrypt();

    const hashedText = await encrypter.encrypt('correct-horse-battery');

    expect(hashedText).toMatch(/^\$2[aby]\$10\$/);
    expect(hashedText).not.toContain('correct-horse-battery');
    await expect(encrypter.compare('correct-horse-battery', hashedText)).resolves.toBe(true);
    await expect(encrypter.compare('wrong-horse-battery', hashedText)).resolves.toBe(false);
  });
});
