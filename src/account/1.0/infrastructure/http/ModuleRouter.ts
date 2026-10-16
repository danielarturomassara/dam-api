import register from '@account/infrastructure/http/handler/register.js';
import {CoreConfig} from '@core/domain/CoreConfig.js';
import {HttpRouter} from '@core/domain/HttpRouter.js';
import {Logger} from '@core/domain/Logger.js';
import {baseHandler} from '@core/infrastructure/http/handler/baseHandler.js';
import {Router} from 'express';

const MODULE_NAME = 'account';

export class ModuleRouter implements HttpRouter {
  public constructor (
    private readonly coreConfig: CoreConfig,
    private readonly logger: Logger
  ) {}

  public getBasePath (): string {
    return '/auth';
  }

  public async registerRoutes (): Promise<Router> {
    const router = Router();

    router.get('/', baseHandler(this.coreConfig.getApiName(), MODULE_NAME));
    router.post('/register', register);

    this.logger.info(`Registered the ${MODULE_NAME} routes.`);

    return router;
  }
}
