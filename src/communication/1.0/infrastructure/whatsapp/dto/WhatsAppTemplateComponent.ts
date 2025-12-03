import { WhatsAppTemplateComponentParameter, WhatsAppTemplateComponentParameterPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppTemplateComponentParameter.js';
import { WHATSAPP_CONTENT_TYPES } from '@communication/infrastructure/whatsapp/type/WhatsApp.js';

export interface WhatsAppTemplateComponentPrimitives {
  parameters?: Array<WhatsAppTemplateComponentParameterPrimitives>;
  type: WHATSAPP_CONTENT_TYPES
}

export class WhatsAppTemplateComponent {
  public parameters?: Array<WhatsAppTemplateComponentParameter>;
  public type: WHATSAPP_CONTENT_TYPES;

  public constructor (primitives: WhatsAppTemplateComponentPrimitives) {
    this.type = primitives.type;
    this.parameters = primitives.parameters ? primitives.parameters.map(parameter => new WhatsAppTemplateComponentParameter(parameter)) : undefined;
  }

  public toPrimitives (): WhatsAppTemplateComponentPrimitives {
    return {
      parameters: this.parameters ? this.parameters.map(parameter => parameter.toPrimitives()) : undefined,
      type: this.type
    };
  }
}
