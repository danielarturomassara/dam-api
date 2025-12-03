import { LanguageTag } from '@core/domain/valueObject/LanguageTag.js';

export class WhatsAppLanguageTag extends LanguageTag {
  public constructor (value: string) {
    const isoValue = value.replace('_', '-');

    super(isoValue);
  }

  public toPrimitives (): string {
    const whatsappValue = this.value.replace('-', '_');

    return whatsappValue;
  }
}
