export class ServerError extends Error {
  public constructor (message?: string) {
    super();

    this.message = `Server error. ${ message ?? ''}`;
  }
}
