export class UnavailableForLegalReasons extends Error {
  public constructor (message: string = 'Unavailable for legal reasons.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
