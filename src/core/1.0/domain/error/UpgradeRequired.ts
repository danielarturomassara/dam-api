export class UpgradeRequired extends Error {
  public constructor (message: string = 'Upgrade required.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
