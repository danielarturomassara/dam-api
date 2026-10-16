export class RequestHeaderFieldsTooLarge extends Error {
  public constructor (message: string = 'Request header fields too large.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
