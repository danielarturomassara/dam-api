export class Gone extends Error {
  public constructor (message: string = 'Gone.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
