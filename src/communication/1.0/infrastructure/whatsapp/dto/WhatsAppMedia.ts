import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppMediaPrimitives {
  link: string;
}

export class WhatsAppMedia {
  public link: TrimmedString;

  public constructor (primitives: WhatsAppMediaPrimitives) {
    this.link = new TrimmedString(primitives.link);
  }

  public toPrimitives (): WhatsAppMediaPrimitives {
    return {
      link: this.link.toPrimitives()
    };
  }
}
