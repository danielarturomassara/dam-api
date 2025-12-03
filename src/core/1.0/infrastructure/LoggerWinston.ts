import { Config } from '@core/Config.js';
import { Logger } from '@core/domain/Logger.js';
import { inject, injectable } from 'inversify';
import { Format } from 'logform';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@injectable()
export class LoggerWinston implements Logger {
  private appName: string;
  private appPort: number;
  private isDebugEnabled: boolean;
  private levelColors: Record<string, string>;
  private logger: WinstonLogger;
  private logLevel: string;
  private nodeEnvironment: string;
  private timestampFormat: string;

  public constructor (@inject(Config) config: Config) {
    this.nodeEnvironment = config.getNodeEnvironment();
    this.appPort = config.getApiPort();
    this.appName = config.getApiName();
    this.isDebugEnabled = config.getDebugEnabled();
    this.logLevel = config.getLogLevel();
    this.timestampFormat = 'YYYY-MM-DD HH:mm:ss:SSS Z';
    this.levelColors = {
      debug: 'brightCyan',
      error: 'red',
      info: 'brightBlue',
      warn: 'yellow'
    };

    this.logger = createLogger({
      defaultMeta: {
        app_name: this.appName,
        app_port: this.appPort,
        debug_enabled: this.isDebugEnabled,
        log_level: this.logLevel
      },
      format: this.getFormat(),
      level: this.logLevel,
      transports: [
        new transports.Console(),
        new DailyRotateFile({
          datePattern: 'YYYY-MM-DD-HH',
          dirname: './logs/',
          filename: `%DATE%-${ this.nodeEnvironment }-info.log`,
          level: 'info',
          maxFiles: '14d',
          maxSize: '20m',
          zippedArchive: true
        }),
        new DailyRotateFile({
          datePattern: 'YYYY-MM-DD-HH',
          dirname: './logs/',
          filename: `%DATE%-${ this.nodeEnvironment }-error.log`,
          level: 'error',
          maxFiles: '14d',
          maxSize: '20m',
          zippedArchive: true
        })
      ]
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public debug (message: string, meta?: Array<any>): void {
    this.logger.debug(message, meta);
  }

  public error (error: Error): void {
    this.logger.error({
      message: error.message,
      name: error.name,
      stack: error.stack
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public info (message: string, meta?: Array<any>): void {
    this.logger.info(message, meta);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public warning (message: string, meta?: Array<any>): void {
    this.logger.warn(message, meta);
  }

  private getDevelopmentFormat (): Format {
    return format.combine(
      format.timestamp({ format: this.timestampFormat }),
      format.prettyPrint({
        colorize: false,
        depth: 5
      }),
      format.colorize({
        all: true,
        colors: this.levelColors
      })
    );
  }

  private getFormat (): Format {
    if (this.isDebugEnabled) {
      return this.getDevelopmentFormat();
    }

    return this.getProductionFormat();
  }

  private getProductionFormat (): Format {
    return format.combine(
      format.timestamp({ format: this.timestampFormat }),
      format.colorize({
        colors: this.levelColors,
        level: true
      }),
      format.printf(log => {
        return `${ log.timestamp } ${ log.app_name }:${ log.app_port } ${ log.level }: ${ log.message }`;
      })
    );
  }
}
