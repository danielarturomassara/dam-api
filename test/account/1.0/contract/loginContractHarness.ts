import {ACCOUNT_REPOSITORY} from '@account/domain/AccountRepository.js';
import {ENCRYPTER} from '@account/domain/Encrypter.js';
import {LOGIN_CHALLENGE_REPOSITORY} from '@account/domain/LoginChallengeRepository.js';
import {TOKEN_SIGNING_CONFIG} from '@account/domain/TokenSigningConfig.js';
import {ModuleRouter} from '@account/infrastructure/http/ModuleRouter.js';
import {CORE_CONFIG} from '@core/domain/CoreConfig.js';
import {HttpRouter} from '@core/domain/HttpRouter.js';
import {LOGGER} from '@core/domain/Logger.js';
import {REQUEST_THROTTLE} from '@core/domain/RequestThrottle.js';
import {HttpServerExpress} from '@core/infrastructure/http/HttpServerExpress.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {Router} from 'express';

import {CoreConfigFake} from '../../../core/1.0/double/CoreConfigFake.js';
import {LoggerSpy} from '../../../core/1.0/double/LoggerSpy.js';
import {RequestThrottleScripted} from '../../../core/1.0/double/RequestThrottleScripted.js';
import {AccountRepositoryInMemory} from '../double/AccountRepositoryInMemory.js';
import {EncrypterCounting} from '../double/EncrypterCounting.js';
import {LoginChallengeRepositoryInMemory} from '../double/LoginChallengeRepositoryInMemory.js';
import {TokenSigningConfigFake} from '../double/TokenSigningConfigFake.js';

export const CONTRACT_API_NAME = 'api-test';

export const CONTRACT_SIGNING_SECRET = 'test-signing-secret-of-at-least-32-characters';

export interface ContractResponse {
  body: string;
  cacheControl: null | string;
  challenge: null | string;
  contentType: string;
  retryAfter: null | string;
  status: number;
}

export class LoginContractHarness {
  public readonly accountRepository: AccountRepositoryInMemory = new AccountRepositoryInMemory();
  public readonly encrypter: EncrypterCounting = new EncrypterCounting();
  public readonly logger: LoggerSpy = new LoggerSpy();
  public readonly loginChallengeRepository: LoginChallengeRepositoryInMemory = new LoginChallengeRepositoryInMemory();
  public readonly requestThrottle: RequestThrottleScripted = new RequestThrottleScripted();
  private readonly httpServer: HttpServerExpress;

  public constructor (private readonly port: number) {
    const logger = this.logger;

    class AccountOnlyRouter implements HttpRouter {
      public getBasePath (): string {
        return '/';
      }

      public async registerRoutes (): Promise<Router> {
        const moduleRouter = new ModuleRouter(new CoreConfigFake(), logger);
        const router = Router();

        router.use(moduleRouter.getBasePath(), await moduleRouter.registerRoutes());

        return router;
      }
    }

    this.httpServer = new HttpServerExpress(new CoreConfigFake({apiPort: port}), logger, new AccountOnlyRouter());
  }

  public async post (path: string, body: unknown): Promise<ContractResponse> {
    const response = await fetch(`http://127.0.0.1:${this.port}${path}`, {
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: {'content-type': 'application/json'},
      method: 'POST'
    });

    return {
      body: await response.text(),
      cacheControl: response.headers.get('cache-control'),
      challenge: response.headers.get('www-authenticate'),
      contentType: response.headers.get('content-type') ?? '',
      retryAfter: response.headers.get('retry-after'),
      status: response.status
    };
  }

  public reset (): void {
    this.accountRepository.accountList.splice(0);
    this.loginChallengeRepository.challengeList.splice(0);
    this.logger.warningList.splice(0);
    this.logger.errorList.splice(0);
    this.requestThrottle.consumedList.splice(0);
    this.requestThrottle.policyList.splice(0);
    this.requestThrottle.nextDecision = {isAllowed: true, retryAfterSeconds: 0};
    this.encrypter.compareCallCount = 0;
    this.encrypter.encryptCallCount = 0;
  }

  public async start (): Promise<void> {
    const bindingList: Array<[symbol, unknown]> = [
      [ACCOUNT_REPOSITORY, this.accountRepository],
      [CORE_CONFIG, new CoreConfigFake({apiName: CONTRACT_API_NAME})],
      [ENCRYPTER, this.encrypter],
      [LOGGER, this.logger],
      [LOGIN_CHALLENGE_REPOSITORY, this.loginChallengeRepository],
      [REQUEST_THROTTLE, this.requestThrottle],
      [TOKEN_SIGNING_CONFIG, new TokenSigningConfigFake(CONTRACT_SIGNING_SECRET)]
    ];

    for (const [token, double] of bindingList) {
      await dependencyContainer.unbind(token);

      dependencyContainer.bind(token).toConstantValue(double);
    }

    await this.httpServer.start();
  }

  public async stop (): Promise<void> {
    await this.httpServer.stop();
  }
}
