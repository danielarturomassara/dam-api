import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface WhatsAppInteractiveActionSectionRowPrimitives {
  description?: string;
  id: string;
  title: string;
}

export class WhatsAppInteractiveActionSectionRow {
  public description?: TrimmedString;
  public id: TrimmedString;
  public title: TrimmedString;

  public constructor (primitives: WhatsAppInteractiveActionSectionRowPrimitives) {
    this.id = new TrimmedString(primitives.id);
    this.title = new TrimmedString(primitives.title);
    this.description = primitives.description ? new TrimmedString(primitives.description) : undefined;
  }

  public toPrimitives (): WhatsAppInteractiveActionSectionRowPrimitives {
    return {
      description: this.description ? this.description.toPrimitives() : undefined,
      id: this.id.toPrimitives(),
      title: this.title.toPrimitives()
    };
  }
}
