export class ServerError extends Error {
  public constructor (message?: string) {
    super();

    this.name = this.constructor.name;

    this.message = `Server error. ${message ?? ''}`;
  }
}
