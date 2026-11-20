import {ACCOUNT_CONFIG, AccountConfig} from '@account/domain/AccountConfig.js';
import {THROTTLE_SCOPES} from '@account/domain/ThrottleScopes.js';
import login from '@account/infrastructure/http/handler/login.js';
import refreshAccessToken from '@account/infrastructure/http/handler/refreshAccessToken.js';
import register from '@account/infrastructure/http/handler/register.js';
import requestLoginCode from '@account/infrastructure/http/handler/requestLoginCode.js';
import verifyIdentity from '@account/infrastructure/http/handler/verifyIdentity.js';
import {CoreConfig} from '@core/domain/CoreConfig.js';
import {HttpRouter} from '@core/domain/HttpRouter.js';
import {Logger} from '@core/domain/Logger.js';
import {REQUEST_THROTTLE, RequestThrottle} from '@core/domain/RequestThrottle.js';
import {baseHandler} from '@core/infrastructure/http/handler/baseHandler.js';
import {throttle} from '@core/infrastructure/http/middleware/throttle.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {RequestHandler, Router} from 'express';

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
    const throttleScope = this.buildThrottleOfScope();

    router.get('/', baseHandler(this.coreConfig.getApiName(), MODULE_NAME));
    router.post('/login', throttleScope(THROTTLE_SCOPES.LOGIN), login);
    router.post('/login/code', throttleScope(THROTTLE_SCOPES.LOGIN_CODE), requestLoginCode);
    router.post('/register', throttleScope(THROTTLE_SCOPES.REGISTER), register);
    router.post('/token/refresh', refreshAccessToken);
    router.post('/verify', throttleScope(THROTTLE_SCOPES.VERIFY), verifyIdentity);

    this.logger.info(`Registered the ${MODULE_NAME} routes.`);

    return router;
  }

  private buildThrottleOfScope (): (scope: THROTTLE_SCOPES) => RequestHandler {
    const requestThrottle = dependencyContainer.get<RequestThrottle>(REQUEST_THROTTLE);
    const throttlePolicy = dependencyContainer.get<AccountConfig>(ACCOUNT_CONFIG).getThrottlePolicy();

    return (scope: THROTTLE_SCOPES): RequestHandler => throttle(requestThrottle, scope, throttlePolicy);
  }
}
