export class RangeNotSatisfiable extends Error {
  public constructor (message: string = 'Range not satisfiable.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
