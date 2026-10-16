export class ImATeapot extends Error {
  public constructor (message: string = 'I\'m a teapot.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
