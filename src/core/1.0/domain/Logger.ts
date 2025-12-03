/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Logger {
  debug (message: string, meta?: Array<any>): void
  error (error: Error): void
  info (message: string, meta?: Array<any>): void
  warning (message: string, meta?: Array<any>): void
}

export const LOGGER = Symbol.for('Logger');
