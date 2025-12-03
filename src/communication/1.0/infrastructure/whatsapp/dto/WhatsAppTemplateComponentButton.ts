import { WHATSAPP_CONTENT_BUTTON_TYPES } from '@communication/infrastructure/whatsapp/type/WhatsApp.js';
import { WhatsAppButtonIndex } from '@communication/infrastructure/whatsapp/valueObject/WhatsAppButtonIndex.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppTemplateComponentButtonPrimitives {
  index: number;
  sub_type: WHATSAPP_CONTENT_BUTTON_TYPES;
  text?: string;
}

export class WhatsAppTemplateComponentButton {
  public index: WhatsAppButtonIndex;
  public sub_type: WHATSAPP_CONTENT_BUTTON_TYPES;
  public text?: TrimmedString;

  public constructor (primitives: WhatsAppTemplateComponentButtonPrimitives) {
    this.sub_type = primitives.sub_type;
    this.index = new WhatsAppButtonIndex(primitives.index);
    this.text = primitives.text ? new TrimmedString(primitives.text) : undefined;
  }

  public toPrimitives (): WhatsAppTemplateComponentButtonPrimitives {
    return {
      index: this.index.toPrimitives(),
      sub_type: this.sub_type,
      text: this.text ? this.text.toPrimitives() : undefined
    };
  }
}
