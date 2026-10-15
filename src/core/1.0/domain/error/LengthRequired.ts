export class LengthRequired extends Error {
  public constructor (message: string = 'Length required.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
