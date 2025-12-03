import { WhatsAppInteractiveActionButton, WhatsAppInteractiveActionButtonPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractiveActionButton.js';
import { WhatsAppInteractiveActionSection, WhatsAppInteractiveActionSectionPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractiveActionSection.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppInteractiveActionPrimitives {
  button?: string;
  buttons?: Array<WhatsAppInteractiveActionButtonPrimitives>;
  sections?: Array<WhatsAppInteractiveActionSectionPrimitives>;
}

export class WhatsAppInteractiveAction {
  public button?: TrimmedString;
  public buttons?: Array<WhatsAppInteractiveActionButton>;
  public sections?: Array<WhatsAppInteractiveActionSection>;

  public constructor (primitives: WhatsAppInteractiveActionPrimitives) {
    this.button = primitives.button ? new TrimmedString(primitives.button) : undefined;
    this.buttons = primitives.buttons ? primitives.buttons.map(button => new WhatsAppInteractiveActionButton(button)) : undefined;
    this.sections = primitives.sections ? primitives.sections.map(section => new WhatsAppInteractiveActionSection(section)) : undefined;
  }

  public toPrimitives (): WhatsAppInteractiveActionPrimitives {
    return {
      button: this.button ? this.button.toPrimitives() : undefined,
      buttons: this.buttons ? this.buttons.map(button => button.toPrimitives()) : undefined,
      sections: this.sections ? this.sections.map(section => section.toPrimitives()) : undefined
    };
  }
}
