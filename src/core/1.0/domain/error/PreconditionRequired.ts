export class PreconditionRequired extends Error {
  public constructor (message: string = 'Precondition required.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
