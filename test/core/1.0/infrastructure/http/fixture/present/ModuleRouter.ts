import {CoreConfig} from '@core/domain/CoreConfig.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {HttpRouter} from '@core/domain/HttpRouter.js';
import {Logger} from '@core/domain/Logger.js';
import {Router} from 'express';

// Discovery fixture: a well-formed module router the HttpRouterExpress suite discovers by
// changing the working directory to the fixture root.
export class ModuleRouter implements HttpRouter {
  public constructor (
    private readonly coreConfig: CoreConfig,
    private readonly logger: Logger
  ) {}

  public getBasePath (): string {
    return '/present';
  }

  public async registerRoutes (): Promise<Router> {
    const router = Router();

    router.get('/', (_request, response): void => {
      response.status(200).json(`${this.coreConfig.getApiName()} present`);
    });
    router.get('/missing', (): void => {
      throw new NotFound('Thing');
    });

    this.logger.info('present routes registered');

    return router;
  }
}
