import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppInteractiveFooterPrimitives {
  text: string;
}

export class WhatsAppInteractiveFooter {
  public text: TrimmedString;

  public constructor (primitives: WhatsAppInteractiveFooterPrimitives) {
    this.text = new TrimmedString(primitives.text);
  }

  public toPrimitives (): WhatsAppInteractiveFooterPrimitives {
    return {
      text: this.text.toPrimitives()
    };
  }
}
