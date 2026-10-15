export class NotAcceptable extends Error {
  public constructor (message: string = 'Not acceptable.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
