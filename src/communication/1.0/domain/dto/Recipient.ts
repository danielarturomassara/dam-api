import { Email } from '@core/domain/valueObject/Email.js';
import { Phone } from '@core/domain/valueObject/Phone.js';

export interface RecipientPrimitives {
  email: string;
  phone: string;
}

export class Recipient {
  public email: Email;
  public phone: Phone;

  public constructor (primitives: RecipientPrimitives) {
    this.email = new Email(primitives.email);
    this.phone = new Phone(primitives.phone);
  }

  public toPrimitives (): RecipientPrimitives {
    return {
      email: this.email.toPrimitives(),
      phone: this.phone.toPrimitives()
    };
  }
}
