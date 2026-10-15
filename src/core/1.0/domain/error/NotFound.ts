export class NotFound extends Error {
  public constructor (resource: string) {
    super();

    this.name = this.constructor.name;

    this.message = `${resource} not found.`;
  }
}
