// Architecture rules — NestJS backend, CLEAN + hexagonal.
// Layout: src/<module>/(1.0/)?{domain,application,infrastructure,contract} plus the Nest module file
// src/<module>/(1.0/)?<module>.module.ts, which is the ONLY composition root of that context: it binds
// port tokens to adapters. Controllers, guards, pipes, interceptors and request DTOs are driving
// adapters and live in infrastructure/http/. ORMs, drivers, queues and every @nestjs/* package other
// than @nestjs/common live in infrastructure/. Nest's DI decorators (@Injectable, @Inject from
// @nestjs/common) are the only framework surface application/ may touch — mirroring the inversify
// allowance in the Express variant; domain/ touches none.

const ANY_MODULE = '^src/[^/]+/(?:1\\.0/)?';

const DOMAIN = `${ANY_MODULE}domain`;
const APPLICATION = `${ANY_MODULE}application`;
const INFRASTRUCTURE = `${ANY_MODULE}infrastructure`;
const CONTRACT = `${ANY_MODULE}contract/`;
const COMPOSITION_ROOT = `${ANY_MODULE}[^/]+\\.module\\.ts$`;

const NEST_DI_PACKAGE = '^@nestjs/common$';
const NEST_OTHER_PACKAGES = '^@nestjs/(?!common$)';
const HTTP_FRAMEWORK_PACKAGES = '^(express|fastify|@fastify/.*|class-validator|class-transformer|@nestjs/swagger)$';
const DRIVER_PACKAGES =
  '^(@prisma/client|drizzle-orm|knex|mariadb|mongodb|mongoose|mysql|mysql2|neo4j-driver|pg|pg-promise|postgres|prisma|sequelize|typeorm|ioredis|redis|kafkajs|amqplib|bullmq|nodemailer|axios)';

module.exports = {
  forbidden: [
    // ── hexagonal core ──────────────────────────────────────────────────────────────────────
    {
      comment: 'domain imports nothing from application or infrastructure',
      from: {path: DOMAIN},
      name: 'domain-stays-pure',
      severity: 'error',
      to: {path: `${ANY_MODULE}(application|infrastructure)`}
    },
    {
      comment: 'domain is framework-free: no @nestjs/*, no http framework, no driver',
      from: {path: DOMAIN},
      name: 'domain-no-frameworks',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: `(^@nestjs/|${HTTP_FRAMEWORK_PACKAGES}|${DRIVER_PACKAGES})`}
    },
    {
      comment: 'application depends on ports (domain), never on adapters',
      from: {path: APPLICATION},
      name: 'application-no-infrastructure',
      severity: 'error',
      to: {path: INFRASTRUCTURE}
    },
    {
      comment: 'application may use @nestjs/common for DI decorators only — every other @nestjs/* package is infrastructure',
      from: {path: APPLICATION},
      name: 'application-nest-common-only',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: NEST_OTHER_PACKAGES}
    },
    {
      comment: 'use cases speak to ports only — no http framework, no validation decorators, no driver',
      from: {path: APPLICATION},
      name: 'application-stays-port-level',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: `(${HTTP_FRAMEWORK_PACKAGES}|${DRIVER_PACKAGES})`}
    },

    // ── the Nest composition root ───────────────────────────────────────────────────────────
    {
      comment: 'only a *.module.ts file (the composition root) and infrastructure itself may name a concrete adapter',
      from: {pathNot: `(${COMPOSITION_ROOT}|${INFRASTRUCTURE})`},
      name: 'adapters-only-from-module-file',
      severity: 'error',
      to: {path: `${INFRASTRUCTURE}/`}
    },
    {
      comment: 'a module file composes its own context: it never reaches into another context\'s adapters',
      from: {path: '^src/([^/]+)/(?:1\\.0/)?[^/]+\\.module\\.ts$'},
      name: 'module-file-composes-own-context-only',
      severity: 'error',
      to: {path: '^src/(?!core/)[^/]+/(?:1\\.0/)?infrastructure/', pathNot: '^src/$1/(?:1\\.0/)?'}
    },
    {
      comment: 'controllers, guards, pipes and request DTOs are driving adapters: they live in infrastructure/http, nowhere else',
      from: {pathNot: `${INFRASTRUCTURE}/http/`},
      name: 'http-adapters-live-in-infrastructure-http',
      severity: 'error',
      to: {path: '\\.(controller|guard|pipe|interceptor|filter|middleware)\\.ts$'}
    },

    // ── contexts, core, hygiene ─────────────────────────────────────────────────────────────
    {
      comment: 'a context may reach another context ONLY through its contract/ surface',
      from: {path: '^src/([^/]+)/(?:1\\.0/)?'},
      name: 'context-contract-only',
      severity: 'error',
      to: {path: '^src/(?!core/)[^/]+/(?:1\\.0/)?(?!contract/)', pathNot: '^src/$1/(?:1\\.0/)?'}
    },
    {
      comment: 'contract/ exports primitives-only DTOs — never domain, application or infrastructure',
      from: {path: CONTRACT},
      name: 'contract-stays-primitive',
      severity: 'error',
      to: {path: `${ANY_MODULE}(application|domain|infrastructure)/`}
    },
    {
      comment: 'core must never import from a feature context',
      from: {path: '^src/core/'},
      name: 'core-imports-no-features',
      severity: 'error',
      to: {path: '^src/(?!core/)[^/]+/'}
    },
    {
      comment: 'no dependency cycles anywhere (Nest forwardRef is a smell, not a fix)',
      from: {},
      name: 'no-circular',
      severity: 'error',
      to: {circular: true}
    },
    {
      comment: 'production code must not depend on devDependencies (type-only imports of @types are fine)',
      from: {path: '^src/'},
      name: 'not-to-dev-dep',
      severity: 'error',
      to: {dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'], pathNot: ['node_modules/@types/']}
    },
    {
      comment: 'every runtime import must be declared in package.json',
      from: {path: '^src/'},
      name: 'no-non-package-json',
      severity: 'error',
      to: {dependencyTypes: ['npm-no-pkg', 'npm-unknown']}
    }
  ],
  options: {
    doNotFollow: {path: 'node_modules'},
    exclude: {path: '\\.(test|spec|e2e-spec)\\.ts$'},
    tsConfig: {fileName: 'tsconfig.json'},
    tsPreCompilationDeps: true
  }
};

// Referenced for documentation: the DI package application/ is allowed to import.
void NEST_DI_PACKAGE;
