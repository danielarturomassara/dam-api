import 'reflect-metadata';
import { HTTP_SERVER, HttpServer } from '@core/domain/HttpServer.js';
import { inject } from 'inversify';

export class App {
  public server: HttpServer;

  public constructor (@inject(HTTP_SERVER) server: HttpServer) {
    this.server = server;
  }

  public async start (): Promise<void> {
    await this.server.start();
  }
}
