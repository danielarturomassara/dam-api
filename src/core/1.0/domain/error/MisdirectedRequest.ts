export class MisdirectedRequest extends Error {
  public constructor (message: string = 'Misdirected request.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
