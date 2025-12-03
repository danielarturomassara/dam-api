import { Agent } from '@communication/domain/dto/Agent.js';
import { CrmPayloadWithPhone } from '@communication/domain/dto/CrmPayloadWithPhone.js';

export interface CrmPayloadWithPhoneAndAssignedAgent extends CrmPayloadWithPhone {
  agent: Agent;
}
