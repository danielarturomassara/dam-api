import {CORE_CONFIG, CoreConfig} from '@core/domain/CoreConfig.js';
import {Logger} from '@core/domain/Logger.js';
import {LOG_LEVELS} from '@core/domain/type/LogLevels.js';
import {inject, injectable} from 'inversify';
import {createLogger, format, Logform, transports, Logger as WinstonLogger} from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const WINSTON_LEVEL_BY_LOG_LEVEL = {
  [LOG_LEVELS.DEBUG]: 'debug',
  [LOG_LEVELS.ERROR]: 'error',
  [LOG_LEVELS.INFO]: 'info',
  [LOG_LEVELS.WARNING]: 'warn'
} satisfies Record<LOG_LEVELS, string>;

const LEVEL_COLORS: Record<string, string> = {
  debug: 'brightCyan',
  error: 'red',
  info: 'brightBlue',
  warn: 'yellow'
};

const TIMESTAMP_FORMAT = 'YYYY-MM-DD HH:mm:ss:SSS Z';

@injectable()
export class LoggerWinston implements Logger {
  private readonly logger: WinstonLogger;

  public constructor (@inject(CORE_CONFIG) coreConfig: CoreConfig) {
    const nodeEnvironment = coreConfig.getNodeEnvironment();

    this.logger = createLogger({
      defaultMeta: {
        app_name: coreConfig.getApiName(),
        app_port: coreConfig.getApiPort(),
        debug_enabled: coreConfig.isDebugEnabled(),
        log_level: coreConfig.getLogLevel()
      },
      format: coreConfig.isDebugEnabled() ? this.buildDebugFormat() : this.buildStandardFormat(),
      level: WINSTON_LEVEL_BY_LOG_LEVEL[coreConfig.getLogLevel()],
      transports: [
        new transports.Console(),
        this.buildRotatingFileTransport(nodeEnvironment, 'info'),
        this.buildRotatingFileTransport(nodeEnvironment, 'error')
      ]
    });
  }

  public debug (message: string, meta?: Array<unknown>): void {
    this.logger.debug(message, meta);
  }

  public error (error: Error): void {
    this.logger.error({message: error.message, name: error.name, stack: error.stack});
  }

  public info (message: string, meta?: Array<unknown>): void {
    this.logger.info(message, meta);
  }

  public warning (message: string, meta?: Array<unknown>): void {
    this.logger.warn(message, meta);
  }

  private buildDebugFormat (): Logform.Format {
    return format.combine(
      format.timestamp({format: TIMESTAMP_FORMAT}),
      format.prettyPrint({colorize: false, depth: 5}),
      format.colorize({all: true, colors: LEVEL_COLORS})
    );
  }

  private buildRotatingFileTransport (nodeEnvironment: string, level: string): DailyRotateFile {
    return new DailyRotateFile({
      datePattern: 'YYYY-MM-DD-HH',
      dirname: './logs/',
      filename: `%DATE%-${nodeEnvironment}-${level}.log`,
      level,
      maxFiles: '14d',
      maxSize: '20m',
      zippedArchive: true
    });
  }

  private buildStandardFormat (): Logform.Format {
    return format.combine(
      format.timestamp({format: TIMESTAMP_FORMAT}),
      format.colorize({colors: LEVEL_COLORS, level: true}),
      format.printf((log) => `${log.timestamp} ${log.app_name}:${log.app_port} ${log.level}: ${log.message}`)
    );
  }
}
