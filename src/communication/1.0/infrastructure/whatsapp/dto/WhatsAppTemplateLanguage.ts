import { WhatsAppLanguageTag } from '@communication/infrastructure/whatsapp/valueObject/WhatsAppLanguageTag.js';

export interface WhatsAppTemplateLanguagePrimitives {
  code: string;
}

export class WhatsAppTemplateLanguage {
  public code: WhatsAppLanguageTag;

  public constructor (primitives: WhatsAppTemplateLanguagePrimitives) {
    this.code = new WhatsAppLanguageTag(primitives.code);
  }

  public toPrimitives (): WhatsAppTemplateLanguagePrimitives {
    return {
      code: this.code.toPrimitives()
    };
  }
}
