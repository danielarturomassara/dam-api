import { WhatsAppInteractiveAction, WhatsAppInteractiveActionPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractiveAction.js';
import { WhatsAppInteractiveBody, WhatsAppInteractiveBodyPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractiveBody.js';
import { WhatsAppInteractiveFooter, WhatsAppInteractiveFooterPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractiveFooter.js';
import { WhatsAppInteractiveHeader, WhatsAppInteractiveHeaderPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractiveHeader.js';
import { WHATSAPP_INTERACTIVE_TYPES } from '@communication/infrastructure/whatsapp/type/WhatsApp.js';

export interface WhatsAppInteractivePrimitives {
  action: WhatsAppInteractiveActionPrimitives;
  body: WhatsAppInteractiveBodyPrimitives;
  footer?: WhatsAppInteractiveFooterPrimitives;
  header?: WhatsAppInteractiveHeaderPrimitives;
  type: WHATSAPP_INTERACTIVE_TYPES;
}

export class WhatsAppInteractive {
  public action: WhatsAppInteractiveAction;
  public body: WhatsAppInteractiveBody;
  public footer?: WhatsAppInteractiveFooter;
  public header?: WhatsAppInteractiveHeader;
  public type: WHATSAPP_INTERACTIVE_TYPES;

  public constructor (primitives: WhatsAppInteractivePrimitives) {
    this.action = new WhatsAppInteractiveAction(primitives.action);
    this.body = new WhatsAppInteractiveBody(primitives.body);
    this.footer = primitives.footer ? new WhatsAppInteractiveFooter(primitives.footer) : undefined;
    this.header = primitives.header ? new WhatsAppInteractiveHeader(primitives.header) : undefined;
    this.type = primitives.type;
  }

  public toPrimitives (): WhatsAppInteractivePrimitives {
    return {
      action: this.action.toPrimitives(),
      body: this.body.toPrimitives(),
      footer: this.footer ? this.footer.toPrimitives() : undefined,
      header: this.header ? this.header.toPrimitives() : undefined,
      type: this.type
    };
  }
}
