export interface HttpServer {
  start (): Promise<void>
  stop (): Promise<void>
}
export const HTTP_SERVER = Symbol.for('HttpServer');
