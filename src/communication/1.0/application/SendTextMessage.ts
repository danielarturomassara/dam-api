import { MESSAGE_SENDER, MessageSender } from '@communication/domain/MessageSender.js';
import { Config } from '@core/Config.js';
import { LOGGER, Logger } from '@core/domain/Logger.js';
import { Phone } from '@core/domain/valueObject/Phone.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';
import { inject } from 'inversify';

export class SendTextMessage {
  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger,
    @inject(MESSAGE_SENDER) private messageSender: MessageSender
  ) {}

  public async run (message: TrimmedString, phone: Phone): Promise<void> {
    await this.messageSender.sendTextMessage(message, phone);
  }
}
