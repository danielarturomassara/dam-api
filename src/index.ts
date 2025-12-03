import { HTTP_SERVER, HttpServer } from '@core/domain/HttpServer.js';
import { Logger, LOGGER } from '@core/domain/Logger.js';
import { App } from '@src/App.js';
import { dependencyContainer } from '@src/dependencyContainer.js';

const logger = dependencyContainer.get<Logger>(LOGGER);

try {
  await new App(dependencyContainer.get<HttpServer>(HTTP_SERVER)).start();
} catch (error) {
  if (error instanceof Error) {
    logger.error(error);
  }

  process.exit(1);
}
