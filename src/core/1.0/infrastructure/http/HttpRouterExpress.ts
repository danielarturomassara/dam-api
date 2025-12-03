import { Config } from '@core/Config.js';
import { Conflict } from '@core/domain/error/Conflict.js';
import { Forbidden } from '@core/domain/error/Forbidden.js';
import { InvalidArgument } from '@core/domain/error/InvalidArgument.js';
import { NotFound } from '@core/domain/error/NotFound.js';
import { Unauthorized } from '@core/domain/error/Unauthorized.js';
import { HttpRouter } from '@core/domain/HttpRouter.js';
import { Logger, LOGGER } from '@core/domain/Logger.js';
import { HTTP_CLIENT_ERROR_CODES, HTTP_SERVER_ERROR_CODES } from '@core/domain/type/HttpCodes.js';
import { NextFunction, Request, Response, Router } from 'express';
import { glob } from 'glob';
import { inject, injectable } from 'inversify';
import path, { extname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

@injectable()
export class HttpRouterExpress implements HttpRouter {
  private basePath: string;
  private router: Router;

  public constructor (@inject(Config) private config: Config, @inject(LOGGER) private logger: Logger) {
    this.router = Router();
    this.basePath = '/';
  }

  public getBasePath (): string {
    return this.basePath;
  }

  public async registerRoutes (): Promise<Router> {
    const routerList = await this.getRouters();

    routerList.forEach(async (moduleRouter) => {
      this.router.use(
        this.getBasePath() + moduleRouter.getBasePath(),
        await moduleRouter.registerRoutes()
      );
    });

    this.router.use((error: Error, request: Request, response: Response, _next: NextFunction): void => {
      this.logger.error(error);

      if (error instanceof Unauthorized) {
        response.status(HTTP_CLIENT_ERROR_CODES.UNAUTHORIZED).json(error.message);

        return;
      }

      if (error instanceof Forbidden) {
        response.status(HTTP_CLIENT_ERROR_CODES.FORBIDDEN).json(error.message);

        return;
      }

      if (error instanceof InvalidArgument) {
        response.status(HTTP_CLIENT_ERROR_CODES.BAD_REQUEST).json(error.message);

        return;
      }

      if (error instanceof NotFound) {
        response.status(HTTP_CLIENT_ERROR_CODES.NOT_FOUND).json(error.message);

        return;
      }

      if (error instanceof Conflict) {
        response.status(HTTP_CLIENT_ERROR_CODES.CONFLICT).json(error.message);

        return;
      }

      response.status(HTTP_SERVER_ERROR_CODES.INTERNAL_SERVER_ERROR).json('Unknown error');
    });

    this.logger.info('Router Stack', this.router.stack);

    return this.router;
  }

  private async getRouters (): Promise<Array<HttpRouter>> {
    const currentFilename = fileURLToPath(import.meta.url);
    const currentExtension = extname(currentFilename);
    const routerFiles = await glob(`**/ModuleRouter${currentExtension}`);

    let routerList = [];

    for (const file of routerFiles) {
      const absolutePath = path.resolve(file);
      const fileUrl = pathToFileURL(absolutePath).href;

      this.logger.info(`Loading router from file: ${ fileUrl }`);

      const importedModule = await import(fileUrl);

      const RouterClass = importedModule.ModuleRouter;

      if (typeof RouterClass !== 'function') {
        this.logger.error(new NotFound(`ModuleRouter class in ${ fileUrl }`));

        continue;
      }

      const routerInstance: HttpRouter = new RouterClass(this.config, this.logger);

      routerList.push(routerInstance);
    };

    return routerList;
  }
}
