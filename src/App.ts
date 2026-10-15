import 'reflect-metadata';
import {HTTP_SERVER, HttpServer} from '@core/domain/HttpServer.js';
import {inject, injectable} from 'inversify';

@injectable()
export class App {
  public constructor (@inject(HTTP_SERVER) private readonly httpServer: HttpServer) {}

  public async start (): Promise<void> {
    await this.httpServer.start();
  }
}
