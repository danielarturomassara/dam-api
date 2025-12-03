import { WhatsAppTemplateComponent, WhatsAppTemplateComponentPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppTemplateComponent.js';
import { WhatsAppTemplateLanguage, WhatsAppTemplateLanguagePrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppTemplateLanguage.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppTemplatePrimitives {
  components?: Array<WhatsAppTemplateComponentPrimitives>
  language: WhatsAppTemplateLanguagePrimitives,
  name: string
  namespace?: string;
}

export class WhatsAppTemplate {
  public components?: Array<WhatsAppTemplateComponent>;
  public language: WhatsAppTemplateLanguage;
  public name: TrimmedString;
  public namespace?: TrimmedString;

  public constructor (primitives: WhatsAppTemplatePrimitives) {
    this.components = primitives.components ? primitives.components.map(component => new WhatsAppTemplateComponent(component)) : undefined;
    this.language = new WhatsAppTemplateLanguage(primitives.language);
    this.name = new TrimmedString(primitives.name);
    this.namespace = primitives.namespace ? new TrimmedString(primitives.namespace) : undefined;
  }

  public toPrimitives (): WhatsAppTemplatePrimitives {
    return {
      components: this.components ? this.components.map(component => component.toPrimitives()) : undefined,
      language: this.language.toPrimitives(),
      name: this.name.toPrimitives(),
      namespace: this.namespace ? this.namespace.toPrimitives() : undefined
    };
  }
}
