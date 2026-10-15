export class ProxyAuthenticationRequired extends Error {
  public constructor (message: string = 'Proxy authentication required.') {
    super();

    this.name = this.constructor.name;

    this.message = message;
  }
}
