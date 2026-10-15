import {CORE_CONFIG, CoreConfig} from '@core/domain/CoreConfig.js';
import {HTTP_ROUTER, HttpRouter} from '@core/domain/HttpRouter.js';
import {HttpServer} from '@core/domain/HttpServer.js';
import {Logger, LOGGER} from '@core/domain/Logger.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {errorHandler} from '@core/infrastructure/http/handler/errorHandler.js';
import {notFoundHandler} from '@core/infrastructure/http/handler/notFoundHandler.js';
import {translateBodyParserError} from '@core/infrastructure/http/handler/translateBodyParserError.js';
import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express, {Application} from 'express';
import helmet from 'helmet';
import {Server} from 'http';
import {inject, injectable} from 'inversify';

@injectable()
export class HttpServerExpress implements HttpServer {
  private readonly application: Application;
  private server: Nullable<Server> = null;

  public constructor (
    @inject(CORE_CONFIG) private readonly coreConfig: CoreConfig,
    @inject(LOGGER) private readonly logger: Logger,
    @inject(HTTP_ROUTER) private readonly httpRouter: HttpRouter
  ) {
    this.application = express();
    this.application.use(bodyParser.json({limit: '2mb'}));
    this.application.use(bodyParser.urlencoded({extended: true, limit: '2mb'}));
    this.application.use(helmet());
    this.application.use(helmet.xssFilter());
    this.application.use(helmet.noSniff());
    this.application.use(helmet.hidePoweredBy());
    this.application.use(helmet.frameguard({action: 'deny'}));
    this.application.use(compression());
    this.application.use(cors());
  }

  public async start (): Promise<void> {
    this.application.use(await this.httpRouter.registerRoutes());
    this.application.use(notFoundHandler);
    this.application.use(translateBodyParserError);
    this.application.use(errorHandler(this.logger));

    this.server = await this.listen();

    this.logger.info(this.buildStartMessage());
  }

  public async stop (): Promise<void> {
    const server = this.server;

    if (!server) {
      return;
    }

    this.server = null;

    await new Promise<void>((resolve, reject) => {
      server.close((closeError?: Error) => {
        if (closeError) {
          reject(closeError);

          return;
        }

        resolve();
      });
    });
  }

  private buildStartMessage (): string {
    const apiName = this.coreConfig.getApiName();
    const apiPort = this.coreConfig.getApiPort();
    const nodeEnvironment = this.coreConfig.getNodeEnvironment();
    const isDebugEnabled = this.coreConfig.isDebugEnabled();
    const logLevel = this.coreConfig.getLogLevel();

    return `${apiName} running on port ${apiPort} (${nodeEnvironment}, debug ${isDebugEnabled}, log level ${logLevel}).`;
  }

  private listen (): Promise<Server> {
    return new Promise<Server>((resolve, reject) => {
      const server = this.application.listen(this.coreConfig.getApiPort());

      server.once('listening', () => resolve(server));
      server.once('error', reject);
    });
  }
}
