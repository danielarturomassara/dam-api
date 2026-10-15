export class UnprocessableEntity extends Error {
  public constructor (message: string = 'Unprocessable entity.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
