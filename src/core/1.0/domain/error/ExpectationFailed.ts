export class ExpectationFailed extends Error {
  public constructor (message: string = 'Expectation failed.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
