export class PayloadTooLarge extends Error {
  public constructor (message: string = 'Payload too large.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
