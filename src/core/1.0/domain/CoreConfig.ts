import {LOG_LEVELS} from '@core/domain/type/LogLevels.js';

export interface CoreConfig {
  getApiName (): string;
  getApiPort (): number;
  getLogLevel (): LOG_LEVELS;
  getNodeEnvironment (): string;
  isDebugEnabled (): boolean;
}

export const CORE_CONFIG = Symbol.for('CoreConfig');
