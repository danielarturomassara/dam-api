export class DatabaseError extends Error {
  public constructor () {
    super();

    this.name = this.constructor.name;

    this.message = 'Database error.';
  }
}
