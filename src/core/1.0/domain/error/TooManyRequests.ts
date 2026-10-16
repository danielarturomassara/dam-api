export class TooManyRequests extends Error {
  public constructor (message: string = 'Too many requests.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
