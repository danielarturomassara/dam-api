import { CrmPayload } from '@communication/domain/dto/CrmPayload.js';
import { Phone } from '@core/domain/valueObject/Phone.js';

export interface CrmPayloadWithPhone extends CrmPayload {
  phone: Phone;
}
