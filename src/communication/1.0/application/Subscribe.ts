import { HubPayload } from '@communication/domain/dto/HubPayload.js';
import { Config } from '@core/Config.js';
import { InvalidArgument } from '@core/domain/error/InvalidArgument.js';
import { LOGGER, Logger } from '@core/domain/Logger.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';
import { inject } from 'inversify';

export class Subscribe {
  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger
  ) {}

  public async run (payload: HubPayload): Promise<TrimmedString> {
    const token = this.config.getMetaWhatsAppWebhookToken();

    const isModeCorrect = payload.mode.toPrimitives() === 'subscribe';
    const isTokenCorrect = payload.verifyToken.toPrimitives() === token;

    if (!isModeCorrect || !isTokenCorrect) {
      throw new InvalidArgument('Webhook subscription failed. Invalid mode or token.');
    }

    return payload.challenge;
  }
}
