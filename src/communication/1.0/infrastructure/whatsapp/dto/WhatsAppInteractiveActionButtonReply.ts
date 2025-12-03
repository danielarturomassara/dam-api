import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppInteractiveActionButtonReplyPrimitives {
  id: string;
  title: string;
}

export class WhatsAppInteractiveActionButtonReply {
  public id: TrimmedString;
  public title: TrimmedString;

  public constructor (primitives: WhatsAppInteractiveActionButtonReplyPrimitives) {
    this.id = new TrimmedString(primitives.id);
    this.title = new TrimmedString(primitives.title);
  }

  public toPrimitives (): WhatsAppInteractiveActionButtonReplyPrimitives {
    return {
      id: this.id.toPrimitives(),
      title: this.title.toPrimitives()
    };
  }
}
