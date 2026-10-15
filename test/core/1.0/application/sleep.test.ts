import {sleep} from '@core/application/sleep.js';
import {describe, expect, it} from 'vitest';

describe('sleep', (): void => {
  it('resolves after the given milliseconds', async (): Promise<void> => {
    const startedAt = Date.now();

    await sleep(20);

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(15);
  });
});
