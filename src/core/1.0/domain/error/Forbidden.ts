export class Forbidden extends Error {
  public constructor () {
    super();

    this.message = 'You don\'t have permissions to access this resource.';
  }
}
