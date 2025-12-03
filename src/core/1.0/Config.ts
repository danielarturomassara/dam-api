import { Recipient } from '@communication/domain/dto/Recipient.js';
import { LOG_LEVELS } from '@core/domain/type/LogLevels.js';
import { Url } from '@core/domain/valueObject/Url.js';
import dotenv from 'dotenv';
import { injectable } from 'inversify';
import { StringValue } from 'ms';

dotenv.config();

@injectable()
export class Config {
  public getNodeEnvironment (): string {
    return process.env.NODE_ENV as string;
  }

  public getLogLevel (): LOG_LEVELS {
    return process.env.LOG_LEVEL as LOG_LEVELS;
  }

  public getDebugEnabled (): boolean {
    return (process.env.DEBUG as string) === 'true';
  }

  public getApiName (): string {
    return process.env.API_NAME as string;
  }

  public getApiPort (): number {
    return parseInt(process.env.API_PORT as string);
  }

  public getDatabaseHost (): string {
    return process.env.DATABASE_HOST as string;
  }

  public getDatabasePort (): number {
    return parseInt(process.env.DATABASE_PORT as string);
  }

  public getDatabaseUser (): string {
    return process.env.DATABASE_USER as string;
  }

  public getDatabasePassword (): string {
    return process.env.DATABASE_PASSWORD as string;
  }

  public getDatabaseName (): string {
    return process.env.DATABASE_NAME as string;
  }

  public getSecret (): string {
    return process.env.SECRET as string;
  }

  public getTokenExpiration (): StringValue {
    return process.env.TOKEN_EXPIRATION as StringValue;
  }

  public getApiUrl (): Url {
    return new Url(process.env.API_URL as string);
  }

  public getAdminUrl (): Url {
    return new Url(process.env.ADMIN_URL as string);
  }

  public getPublicUrl (): Url {
    return new Url(process.env.PUBLIC_URL as string);
  }

  public getEmailHost (): string {
    return process.env.EMAIL_HOST as string;
  }

  public getEmailPort (): number {
    return parseInt(process.env.EMAIL_PORT as string);
  }

  public getEmailSender (): string {
    return process.env.EMAIL_SENDER as string;
  }

  public getEmailUser (): string {
    return process.env.EMAIL_USER as string;
  }

  public getEmailPassword (): string {
    return process.env.EMAIL_PASSWORD as string;
  }

  public getEmailRemitter (): string {
    return process.env.EMAIL_REMITTER as string;
  }

  public getMetaGraphApiUrl (): string {
    return process.env.META_GRAPH_API_URL as string;
  }

  public getMetaGraphApiVersion (): string {
    return process.env.META_GRAPH_API_VERSION as string;
  }

  public getMetaAppId (): string {
    return process.env.META_APP_ID as string;
  }

  public getMetaWhatsAppEncoding (): string {
    return process.env.META_WHATSAPP_ENCODING as string;
  }

  public getMetaWhatsAppPhoneNumber (): string {
    return process.env.META_WHATSAPP_PHONE_NUMBER as string;
  }

  public getMetaWhatsAppPhoneId (): string {
    return process.env.META_WHATSAPP_PHONE_ID as string;
  }

  public getMetaWhatsAppBusinessId (): string {
    return process.env.META_WHATSAPP_BUSINESS_ID as string;
  }

  public getMetaWhatsAppAdminToken (): string {
    return process.env.META_WHATSAPP_ADMIN_TOKEN as string;
  }

  public getMetaWhatsAppWebhookToken (): string {
    return process.env.META_WHATSAPP_WEBHOOK_TOKEN as string;
  }

  public getChatwootApiUrl (): string {
    return process.env.CHATWOOT_API_URL as string;
  }

  public getChatwootAccountId (): string {
    return process.env.CHATWOOT_ACCOUNT_ID as string;
  }

  public getChatwootApiAdminKey (): string {
    return process.env.CHATWOOT_API_ADMIN_KEY as string;
  }

  public getDebugRecipientEnabled (): boolean {
    return (process.env.DEBUG_RECIPIENT_ENABLED as string) === 'true';
  }

  public getDebugRecipient (): Recipient {
    const debugRecipient = JSON.parse(process.env.DEBUG_RECIPIENT as string);

    return new Recipient(debugRecipient);
  }
}
