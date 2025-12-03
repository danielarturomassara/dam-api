import { Config } from '@core/Config.js';
import { HTTP_ROUTER, HttpRouter } from '@core/domain/HttpRouter.js';
import { HttpServer } from '@core/domain/HttpServer.js';
import { Logger, LOGGER } from '@core/domain/Logger.js';
import bodyParser from 'body-parser';
import compress from 'compression';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { Server } from 'http';
import { inject, injectable } from 'inversify';

@injectable()
export class HttpServerExpress implements HttpServer {
  private app: Application;
  private server?: Server;

  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger,
    @inject(HTTP_ROUTER) private router: HttpRouter
  ) {
    this.app = express();
    this.app.use(bodyParser.json({ limit: '2mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));
    this.app.use(helmet());
    this.app.use(helmet.xssFilter());
    this.app.use(helmet.noSniff());
    this.app.use(helmet.hidePoweredBy());
    this.app.use(helmet.frameguard({ action: 'deny' }));
    this.app.use(compress());
    this.app.use(cors());
    this.router = router;
  }

  public async start (): Promise<void> {
    this.server = this.app.listen(this.config.getApiPort(), () => {
      this.logger.info(`${ this.config.getApiName() } running on port ${ this.config.getApiPort() } (${ this.config.getNodeEnvironment() }, debug ${ this.config.getDebugEnabled() }, log level ${ this.config.getLogLevel() }).`);
    });

    const router = await this.router.registerRoutes();

    this.app.use(router);
  }

  public async stop (): Promise<void> {
    this.server?.close();
  }
}
