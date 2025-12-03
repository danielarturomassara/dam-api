import sendMessage from '@communication/infrastructure/http/handler/sendMessage.js';
import subscribe from '@communication/infrastructure/http/handler/subscribe.js';
import { Config } from '@core/Config.js';
import { HttpRouter } from '@core/domain/HttpRouter.js';
import { Logger, LOGGER } from '@core/domain/Logger.js';
import { baseHandler } from '@core/infrastructure/http/handler/baseHandler.js';
import { Router } from 'express';
import { inject, injectable } from 'inversify';

@injectable()
export class ModuleRouter implements HttpRouter {
  private appName: string;
  private basePath: string;
  private moduleName: string;
  private router: Router;

  public constructor (
    @inject(Config) private config: Config,
    @inject(LOGGER) private logger: Logger
  ) {
    this.router = Router();
    this.appName = this.config.getApiName();
    this.moduleName = 'Communication';
    this.basePath = 'communication';
  }

  public getBasePath (): string {
    return this.basePath;
  }

  public async registerRoutes (): Promise<Router> {
    this.router.get('/', baseHandler(this.appName, this.moduleName));
    this.router.get('/subscribe', subscribe);
    this.router.post('/messages', sendMessage);

    return this.router;
  }
}
