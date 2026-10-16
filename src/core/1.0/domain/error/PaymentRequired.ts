export class PaymentRequired extends Error {
  public constructor (message: string = 'Payment required.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
