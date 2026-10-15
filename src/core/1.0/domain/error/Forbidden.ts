export class Forbidden extends Error {
  public constructor () {
    super();

    this.name = this.constructor.name;

    this.message = 'You don\'t have permissions to access this resource.';
  }
}
