export class Unauthorized extends Error {
  public constructor (reason: string) {
    super();

    this.message = `Unauthorized. Reason: ${ reason }.`;
  }
}
