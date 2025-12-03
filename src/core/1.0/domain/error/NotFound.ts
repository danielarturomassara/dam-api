export class NotFound extends Error {
  public constructor (resource: string) {
    super();

    this.message = `${ resource } not found.`;
  }
}
