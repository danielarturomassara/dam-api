export class UriTooLong extends Error {
  public constructor (message: string = 'URI too long.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
