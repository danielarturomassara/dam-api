export class Unauthorized extends Error {
  public constructor (reason: string) {
    super();

    this.name = this.constructor.name;

    this.message = `Unauthorized. Reason: ${reason}.`;
  }
}
