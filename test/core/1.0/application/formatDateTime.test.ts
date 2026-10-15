import {formatDateTime} from '@core/application/formatDateTime.js';
import {describe, expect, it} from 'vitest';

describe('formatDateTime', (): void => {
  it('formats as day/month/year hours:minutes:seconds in local time without zero padding', (): void => {
    const date = new Date(2026, 0, 5, 9, 7, 3);

    expect(formatDateTime(date)).toBe('5/1/2026 9:7:3');
  });
});
