import { WHATSAPP_CONTENT_PARAMETER_TYPES } from '@communication/infrastructure/whatsapp/type/WhatsApp.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppTemplateComponentParameterPrimitives {
  text?: string;
  type: WHATSAPP_CONTENT_PARAMETER_TYPES
}

export class WhatsAppTemplateComponentParameter {
  public text?: TrimmedString;
  public type: WHATSAPP_CONTENT_PARAMETER_TYPES;

  public constructor (primitives: WhatsAppTemplateComponentParameterPrimitives) {
    this.type = primitives.type;
    this.text = primitives.text ? new TrimmedString(primitives.text) : undefined;
  }

  public toPrimitives (): WhatsAppTemplateComponentParameterPrimitives {
    return {
      text: this.text ? this.text.toPrimitives() : undefined,
      type: this.type
    };
  }
}
