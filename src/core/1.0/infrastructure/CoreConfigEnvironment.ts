import {CoreConfig} from '@core/domain/CoreConfig.js';
import {ENVIRONMENT_READER, EnvironmentReader} from '@core/domain/EnvironmentReader.js';
import {LOG_LEVELS} from '@core/domain/type/LogLevels.js';
import {inject, injectable} from 'inversify';

@injectable()
export class CoreConfigEnvironment implements CoreConfig {
  private readonly apiName: string;
  private readonly apiPort: number;
  private readonly debugEnabled: boolean;
  private readonly logLevel: LOG_LEVELS;
  private readonly nodeEnvironment: string;

  public constructor (@inject(ENVIRONMENT_READER) environmentReader: EnvironmentReader) {
    this.apiName = environmentReader.getRequiredString('API_NAME');
    this.apiPort = environmentReader.getRequiredNumber('API_PORT');
    this.nodeEnvironment = environmentReader.getRequiredString('NODE_ENV');
    this.debugEnabled = environmentReader.getOptionalBoolean('DEBUG', false);
    this.logLevel = environmentReader.getRequiredEnum('LOG_LEVEL', LOG_LEVELS);
  }

  public getApiName (): string {
    return this.apiName;
  }

  public getApiPort (): number {
    return this.apiPort;
  }

  public getLogLevel (): LOG_LEVELS {
    return this.logLevel;
  }

  public getNodeEnvironment (): string {
    return this.nodeEnvironment;
  }

  public isDebugEnabled (): boolean {
    return this.debugEnabled;
  }
}
