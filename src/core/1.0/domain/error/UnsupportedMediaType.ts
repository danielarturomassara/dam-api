export class UnsupportedMediaType extends Error {
  public constructor (message: string = 'Unsupported media type.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
