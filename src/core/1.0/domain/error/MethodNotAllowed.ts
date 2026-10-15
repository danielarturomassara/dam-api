export class MethodNotAllowed extends Error {
  public constructor (message: string = 'Method not allowed.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
