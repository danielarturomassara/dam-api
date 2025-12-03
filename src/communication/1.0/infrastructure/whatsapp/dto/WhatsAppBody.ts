import { WhatsAppInteractive, WhatsAppInteractivePrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractive.js';
import { WhatsAppTemplate, WhatsAppTemplatePrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppTemplate.js';
import { WhatsAppText, WhatsAppTextPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppText.js';
import { WHATSAPP_MESSAGE_TYPES } from '@communication/infrastructure/whatsapp/type/WhatsApp.js';
import { Phone } from '@core/domain/valueObject/Phone.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppBodyPrimitives {
  interactive?: WhatsAppInteractivePrimitives,
  messaging_product: string;
  recipient_type?: 'individual',
  template?: WhatsAppTemplatePrimitives,
  text?: WhatsAppTextPrimitives;
  to: string;
  type: WHATSAPP_MESSAGE_TYPES;
}

export class WhatsAppBody {
  public interactive?: WhatsAppInteractive;
  public messaging_product: TrimmedString;
  public recipient_type?: 'individual';
  public template?: WhatsAppTemplate;
  public text?: WhatsAppText;
  public to: Phone;
  public type: WHATSAPP_MESSAGE_TYPES;

  public constructor (primitives: WhatsAppBodyPrimitives) {
    this.recipient_type = primitives.recipient_type ? primitives.recipient_type : undefined;
    this.interactive = primitives.interactive ? new WhatsAppInteractive(primitives.interactive) : undefined;
    this.messaging_product = new TrimmedString(primitives.messaging_product);
    this.text = primitives.text ? new WhatsAppText(primitives.text) : undefined;
    this.to = new Phone(primitives.to);
    this.type = primitives.type;
    this.template = primitives.template ? new WhatsAppTemplate(primitives.template) : undefined;
  }

  public toPrimitives (): WhatsAppBodyPrimitives {
    return {
      interactive: this.interactive ? this.interactive.toPrimitives() : undefined,
      messaging_product: this.messaging_product.toPrimitives(),
      recipient_type: this.recipient_type ? this.recipient_type : undefined,
      template: this.template ? this.template.toPrimitives() : undefined,
      text: this.text ? this.text.toPrimitives() : undefined,
      to: this.to.toPrimitives(),
      type: this.type
    };
  }
}
