import { WhatsAppInteractiveActionSectionRow, WhatsAppInteractiveActionSectionRowPrimitives } from '@communication/infrastructure/whatsapp/dto/WhatsAppInteractiveActionSectionRow.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppInteractiveActionSectionPrimitives {
  rows: Array<WhatsAppInteractiveActionSectionRowPrimitives>;
  title?: string;
}

export class WhatsAppInteractiveActionSection {
  public rows: Array<WhatsAppInteractiveActionSectionRow>;
  public title?: TrimmedString;

  public constructor (primitives: WhatsAppInteractiveActionSectionPrimitives) {
    this.title = primitives.title ? new TrimmedString(primitives.title) : undefined;
    this.rows = primitives.rows.map(row => new WhatsAppInteractiveActionSectionRow(row));
  }

  public toPrimitives (): WhatsAppInteractiveActionSectionPrimitives {
    return {
      rows: this.rows.map(row => row.toPrimitives()),
      title: this.title ? this.title.toPrimitives() : undefined
    };
  }
}
