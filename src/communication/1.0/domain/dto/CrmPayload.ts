import { CrmContactCustomAttributes } from '@communication/domain/dto/CrmContactCustomAttributes.js';

export interface CrmPayload {
  accountId?: number;
  conversationId: number;
  crmContactId: number;
  customAttributes?: CrmContactCustomAttributes;
  inboxId: number;
}
