import {Config} from '@core/Config.js';
import {Logger, LOGGER} from '@core/domain/Logger.js';
import {inject, injectable} from 'inversify';

@injectable()
export abstract class UseCase<INPUT, OUTPUT> {
  @inject(Config) protected readonly config!: Config;
  @inject(LOGGER) protected readonly logger!: Logger;

  protected abstract run (input: INPUT): Promise<OUTPUT>;
}
