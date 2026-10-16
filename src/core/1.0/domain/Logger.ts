export interface Logger {
  debug (message: string, meta?: Array<unknown>): void;
  error (error: Error): void;
  info (message: string, meta?: Array<unknown>): void;
  warning (message: string, meta?: Array<unknown>): void;
}

export const LOGGER = Symbol.for('Logger');
