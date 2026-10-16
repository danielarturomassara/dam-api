export class Conflict extends Error {
  public constructor (resource: string) {
    super();

    this.name = this.constructor.name;

    this.message = `Conflict: ${resource}.`;
  }
}
