import { CrmPayloadWithPhone } from '@communication/domain/dto/CrmPayloadWithPhone.js';
import { DNI } from '@communication/domain/valueObject/DNI.js';

export interface CrmPayloadWithPhoneAndDni extends CrmPayloadWithPhone {
  dni: DNI;
}
