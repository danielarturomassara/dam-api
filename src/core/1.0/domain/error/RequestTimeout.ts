export class RequestTimeout extends Error {
  public constructor (message: string = 'Request timeout.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
