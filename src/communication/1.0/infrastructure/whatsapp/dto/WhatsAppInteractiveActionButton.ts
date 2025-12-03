import { WhatsAppInteractiveActionButtonReply, WhatsAppInteractiveActionButtonReplyPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractiveActionButtonReply.js';

export interface WhatsAppInteractiveActionButtonPrimitives {
  reply: WhatsAppInteractiveActionButtonReplyPrimitives;
  type: 'reply';
}

export class WhatsAppInteractiveActionButton {
  public reply: WhatsAppInteractiveActionButtonReply;

  public type: 'reply';

  public constructor (primitives: WhatsAppInteractiveActionButtonPrimitives) {
    this.type = primitives.type;
    this.reply = new WhatsAppInteractiveActionButtonReply(primitives.reply);
  }

  public toPrimitives (): WhatsAppInteractiveActionButtonPrimitives {
    return {
      reply: this.reply.toPrimitives(),
      type: this.type
    };
  }
}
