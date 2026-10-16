import {Logger} from '@core/domain/Logger.js';

export class LoggerSpy implements Logger {
  public readonly debugList: Array<string> = [];
  public readonly errorList: Array<Error> = [];
  public readonly infoList: Array<string> = [];
  public readonly warningList: Array<string> = [];

  public debug (message: string): void {
    this.debugList.push(message);
  }

  public error (error: Error): void {
    this.errorList.push(error);
  }

  public info (message: string): void {
    this.infoList.push(message);
  }

  public warning (message: string): void {
    this.warningList.push(message);
  }
}
