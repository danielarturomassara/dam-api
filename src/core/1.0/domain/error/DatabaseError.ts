export class DatabaseError extends Error {
  public constructor () {
    super();

    this.message = 'Database error.';
  }
}
