export class Conflict extends Error {
  public constructor (resource: string) {
    super();

    this.message = `Conflict: ${ resource }.`;
  }
}
