import { WhatsAppMedia, WhatsAppMediaPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppMedia.js';
import { WHATSAPP_INTERACTIVE_HEADER_TYPES } from '@communication/infrastructure/whatsapp/type/WhatsApp.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppInteractiveHeaderPrimitives {
  document?: WhatsAppMediaPrimitives;
  image?: WhatsAppMediaPrimitives;
  text?: string;
  type: WHATSAPP_INTERACTIVE_HEADER_TYPES;
  video?: WhatsAppMediaPrimitives;
}

export class WhatsAppInteractiveHeader {
  public document?: WhatsAppMedia;
  public image?: WhatsAppMedia;
  public text?: TrimmedString;
  public type: WHATSAPP_INTERACTIVE_HEADER_TYPES;
  public video?: WhatsAppMedia;

  public constructor (primitives: WhatsAppInteractiveHeaderPrimitives) {
    this.type = primitives.type;
    this.text = primitives.text ? new TrimmedString(primitives.text) : undefined;
    this.video = primitives.video ? new WhatsAppMedia(primitives.video) : undefined;
    this.image = primitives.image ? new WhatsAppMedia(primitives.image) : undefined;
    this.document = primitives.document ? new WhatsAppMedia(primitives.document) : undefined;
  }

  public toPrimitives (): WhatsAppInteractiveHeaderPrimitives {
    return {
      document: this.document ? this.document.toPrimitives() : undefined,
      image: this.image ? this.image.toPrimitives() : undefined,
      text: this.text ? this.text.toPrimitives() : undefined,
      type: this.type,
      video: this.video ? this.video.toPrimitives() : undefined
    };
  }
}
