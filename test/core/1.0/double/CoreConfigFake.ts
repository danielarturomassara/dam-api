import {CoreConfig} from '@core/domain/CoreConfig.js';
import {LOG_LEVELS} from '@core/domain/type/LogLevels.js';

export interface CoreConfigFakeOptions {
  apiName?: string;
  apiPort?: number;
  debugEnabled?: boolean;
  logLevel?: LOG_LEVELS;
  nodeEnvironment?: string;
  trustedProxyCount?: number;
}

export class CoreConfigFake implements CoreConfig {
  private readonly apiName: string;
  private readonly apiPort: number;
  private readonly debugEnabled: boolean;
  private readonly logLevel: LOG_LEVELS;
  private readonly nodeEnvironment: string;
  private readonly trustedProxyCount: number;

  public constructor (options: CoreConfigFakeOptions = {}) {
    this.apiName = options.apiName ?? 'api-test';
    this.apiPort = options.apiPort ?? 0;
    this.debugEnabled = options.debugEnabled ?? false;
    this.logLevel = options.logLevel ?? LOG_LEVELS.ERROR;
    this.nodeEnvironment = options.nodeEnvironment ?? 'test';
    this.trustedProxyCount = options.trustedProxyCount ?? 0;
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

  public getTrustedProxyCount (): number {
    return this.trustedProxyCount;
  }

  public isDebugEnabled (): boolean {
    return this.debugEnabled;
  }
}
