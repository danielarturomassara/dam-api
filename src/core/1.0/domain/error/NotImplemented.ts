export class NotImplemented extends Error {
  public constructor () {
    super();

    this.message = 'Not implemented.';
  }
}
