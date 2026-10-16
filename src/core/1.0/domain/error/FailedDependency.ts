export class FailedDependency extends Error {
  public constructor (message: string = 'Failed dependency.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
