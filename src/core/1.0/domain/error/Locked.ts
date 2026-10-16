export class Locked extends Error {
  public constructor (message: string = 'Locked.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
