import 'reflect-metadata';
import {HTTP_SERVER, HttpServer} from '@core/domain/HttpServer.js';
import {Logger, LOGGER} from '@core/domain/Logger.js';
import {STARTUP_CONFIG_VALIDATION} from '@core/domain/StartupConfigValidation.js';
import {App} from '@src/App.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {config as loadDotenv} from 'dotenv';

loadDotenv();

const logger = dependencyContainer.get<Logger>(LOGGER);

try {
  dependencyContainer.getAll<unknown>(STARTUP_CONFIG_VALIDATION);

  await new App(dependencyContainer.get<HttpServer>(HTTP_SERVER)).start();
} catch (error) {
  if (error instanceof Error) {
    logger.error(error);
  }

  process.exit(1);
}
