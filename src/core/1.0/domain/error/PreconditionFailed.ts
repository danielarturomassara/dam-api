export class PreconditionFailed extends Error {
  public constructor (message: string = 'Precondition failed.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
