import {CORE_CONFIG, CoreConfig} from '@core/domain/CoreConfig.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {HttpRouter} from '@core/domain/HttpRouter.js';
import {Logger, LOGGER} from '@core/domain/Logger.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {errorHandler} from '@core/infrastructure/http/handler/errorHandler.js';
import {Router} from 'express';
import {glob} from 'glob';
import {inject, injectable} from 'inversify';
import {extname, posix, resolve} from 'path';
import {fileURLToPath, pathToFileURL} from 'url';

type ModuleRouterClass = new (coreConfig: CoreConfig, logger: Logger) => HttpRouter;

const DISCOVERY_IGNORE_LIST = ['node_modules/**', 'test/**'];

@injectable()
export class HttpRouterExpress implements HttpRouter {
  public constructor (
    @inject(CORE_CONFIG) private readonly coreConfig: CoreConfig,
    @inject(LOGGER) private readonly logger: Logger
  ) {}

  public getBasePath (): string {
    return '/';
  }

  public async registerRoutes (): Promise<Router> {
    const router = Router();

    for (const moduleRouter of await this.discoverModuleRouters()) {
      router.use(posix.join(this.getBasePath(), moduleRouter.getBasePath()), await moduleRouter.registerRoutes());
    }

    router.use(errorHandler(this.logger));

    this.logger.info('Router Stack', router.stack);

    return router;
  }

  private async discoverModuleRouters (): Promise<Array<HttpRouter>> {
    const currentExtension = extname(fileURLToPath(import.meta.url));
    const moduleRouterFileList = await glob(`**/ModuleRouter${currentExtension}`, {ignore: DISCOVERY_IGNORE_LIST});
    const moduleRouterList: Array<HttpRouter> = [];

    for (const moduleRouterFile of moduleRouterFileList) {
      const moduleRouter = await this.loadModuleRouter(pathToFileURL(resolve(moduleRouterFile)).href);

      if (moduleRouter) {
        moduleRouterList.push(moduleRouter);
      }
    }

    return moduleRouterList;
  }

  private async loadModuleRouter (fileUrl: string): Promise<Nullable<HttpRouter>> {
    this.logger.info(`Loading router from file: ${fileUrl}`);

    const importedModule: unknown = await import(fileUrl);
    const moduleRouterExport: unknown = typeof importedModule === 'object' && importedModule !== null
      ? Reflect.get(importedModule, 'ModuleRouter')
      : undefined;

    if (typeof moduleRouterExport !== 'function') {
      this.logger.error(new NotFound(`ModuleRouter class in ${fileUrl}`));

      return null;
    }

    const ModuleRouterConstructor = moduleRouterExport as ModuleRouterClass;

    return new ModuleRouterConstructor(this.coreConfig, this.logger);
  }
}
