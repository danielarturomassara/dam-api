import {LOG_LEVELS} from '@core/domain/type/LogLevels.js';
import {LoggerWinston} from '@core/infrastructure/LoggerWinston.js';
import {describe, expect, it} from 'vitest';

import {CoreConfigFake} from '../double/CoreConfigFake.js';

describe('LoggerWinston', (): void => {
  it.each(Object.values(LOG_LEVELS))('builds a logger for the %s port level and accepts every port method', (logLevel: LOG_LEVELS): void => {
    const logger = new LoggerWinston(new CoreConfigFake({logLevel}));

    expect((): void => {
      logger.debug('debug message', ['meta']);
      logger.info('info message');
      logger.warning('warning message');
      logger.error(new Error('boom'));
    }).not.toThrow();
  });

  it('builds the debug format when debug is enabled', (): void => {
    expect((): unknown => new LoggerWinston(new CoreConfigFake({debugEnabled: true}))).not.toThrow();
  });
});
