import { WhatsAppBody } from '@communication/infrastructure/whatsapp/dto/WhatsAppBody.js';
import { Config } from '@core/Config.js';
import { ServerError } from '@core/domain/error/ServerError.js';
import { Logger, LOGGER } from '@core/domain/Logger.js';
import { HTTP_SUCCESS_CODES } from '@core/domain/type/HttpCodes.js';
import { Phone } from '@core/domain/valueObject/Phone.js';
import axios from 'axios';
import { inject, injectable } from 'inversify';

@injectable()
export class SendMessage {
  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger
  ) {}

  public async run (body: WhatsAppBody): Promise<void> {
    const metaGraphApiUrl = this.config.getMetaGraphApiUrl();
    const metaGraphApiVersion = this.config.getMetaGraphApiVersion();
    const fromPhoneNumberId = this.config.getMetaWhatsAppPhoneId();
    const token = `Bearer ${ this.config.getMetaWhatsAppAdminToken() }`;

    const metaApiUrl = `${ metaGraphApiUrl }/${ metaGraphApiVersion }/${ fromPhoneNumberId }/messages`;

    const targetPhoneNumber = this.getRecipientPhone(body.to);

    const data = {
      ...body.toPrimitives(),
      to: targetPhoneNumber.toPrimitives()
    };

    const response = await axios.post(metaApiUrl,
      data,
      {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      }
    );

    this.logger.debug('WhatsApp response', [response.data]);

    if (response.status === HTTP_SUCCESS_CODES.OK) {
      this.logger.info(`WhatsApp to ${ targetPhoneNumber.toPrimitives() } sent successfully.`);

      return;
    }

    throw new ServerError(`Error sending WhatsApp message template. Error: ${ response.status } ${ response.statusText }`);
  }

  private getRecipientPhone (phone: Phone): Phone {
    const getDebugRecipientEnabled = this.config.getDebugRecipientEnabled();

    if (!getDebugRecipientEnabled) {
      return phone;
    }

    const debugRecipient = this.config.getDebugRecipient();

    if (!debugRecipient) {
      throw new ServerError('No recipient or debug recipient found.');
    }

    return debugRecipient.phone;
  }
}
