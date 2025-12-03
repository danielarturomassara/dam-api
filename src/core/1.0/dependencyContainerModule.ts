import { Config } from '@core/Config.js';
import { DATABASE_CONNECTION, DatabaseConnection } from '@core/domain/DatabaseConnection.js';
import { Encrypter, ENCRYPTER } from '@core/domain/Encrypter.js';
import { HTTP_ROUTER, HttpRouter } from '@core/domain/HttpRouter.js';
import { HTTP_SERVER, HttpServer } from '@core/domain/HttpServer.js';
import { LOGGER, Logger } from '@core/domain/Logger.js';
import { BcryptEncrypter } from '@core/infrastructure/BcryptEncrypter.js';
import { DatabaseConnectionPostgreSQL } from '@core/infrastructure/DatabaseConnectionPostgreSQL.js';
import { HttpRouterExpress } from '@core/infrastructure/http/HttpRouterExpress.js';
import { HttpServerExpress } from '@core/infrastructure/http/HttpServerExpress.js';
import { LoggerWinston } from '@core/infrastructure/LoggerWinston.js';
import { DataSeeder } from '@core/infrastructure/mongodb/migration/DataSeeder.js';
import { RepositoryMongo } from '@core/infrastructure/mongodb/RepositoryMongo.js';
import { ContainerModule, ContainerModuleLoadOptions } from 'inversify';

export default new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind<Config>(Config).toSelf().inSingletonScope();
  options.bind<DatabaseConnection>(DATABASE_CONNECTION).to(DatabaseConnectionPostgreSQL).inSingletonScope();
  options.bind<DataSeeder>(DataSeeder).toSelf();
  options.bind<Encrypter>(ENCRYPTER).to(BcryptEncrypter);
  options.bind<HttpRouter>(HTTP_ROUTER).to(HttpRouterExpress);
  options.bind<HttpServer>(HTTP_SERVER).to(HttpServerExpress);
  options.bind<Logger>(LOGGER).to(LoggerWinston).inSingletonScope();
  options.bind<RepositoryMongo>(RepositoryMongo).toSelf();
});
