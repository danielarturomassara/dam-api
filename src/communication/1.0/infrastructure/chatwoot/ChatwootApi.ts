import { CrmPayload } from '@communication/domain/dto/CrmPayload.js';
import { Config } from '@core/Config.js';
import { LOGGER, Logger } from '@core/domain/Logger.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';
import axios, { AxiosInstance } from 'axios';
import { inject, injectable } from 'inversify';

@injectable()
export class ChatwootApi {
  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger
  ) {}

  public async sendMessage (data: CrmPayload, message: TrimmedString): Promise<void> {
    const axiosInstance = this.axiosConfig();

    const chatwootEndpoint = `api/v1/accounts/${ data.accountId }/conversations/${ data.conversationId }/messages`;

    const body = {
      content: message.toPrimitives()
    };

    await axiosInstance.post(chatwootEndpoint, body);
  }

  private axiosConfig (): AxiosInstance {
    const chatwootApiKey = this.config.getChatwootApiAdminKey();

    return axios.create({
      baseURL: this.config.getChatwootApiUrl(),
      headers: {
        'api_access_token': chatwootApiKey,
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }
}
