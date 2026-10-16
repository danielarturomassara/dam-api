export class TooEarly extends Error {
  public constructor (message: string = 'Too early.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
