import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppInteractiveBodyPrimitives {
  text: string;
}

export class WhatsAppInteractiveBody {
  public text: TrimmedString;

  public constructor (primitives: WhatsAppInteractiveBodyPrimitives) {
    this.text = new TrimmedString(primitives.text);
  }

  public toPrimitives (): WhatsAppInteractiveBodyPrimitives {
    return {
      text: this.text.toPrimitives()
    };
  }
}
