import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppTextPrimitives {
  body: string;
}

export class WhatsAppText {
  public body: TrimmedString;

  public constructor (primitives: WhatsAppTextPrimitives) {
    this.body = new TrimmedString(primitives.body);
  }

  public toPrimitives (): WhatsAppTextPrimitives {
    return {
      body: this.body.toPrimitives()
    };
  }
}
