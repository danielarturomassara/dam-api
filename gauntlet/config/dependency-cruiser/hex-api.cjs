// Architecture rules — hexagonal Node API, CLEAN + hexagonal.
// Layout: src/<module>/(1.0/)?{domain,application,infrastructure,contract} plus one
// dependencyContainerModule.ts per module (the composition root, auto-discovered by
// src/dependencyContainer.ts). The HTTP framework is an adapter and, like every database driver,
// appears only in infrastructure/. The DI decorator package (inversify) is allowed in application/
// (use cases are @injectable with @inject) but stays forbidden in domain/.

const ANY_MODULE = '^src/[^/]+/(?:1\\.0/)?';

const DOMAIN = `${ANY_MODULE}domain`;
const APPLICATION = `${ANY_MODULE}application`;
const INFRASTRUCTURE = `${ANY_MODULE}infrastructure`;
const CONTRACT = `${ANY_MODULE}contract/`;

const DRIVER_PACKAGES =
  '@prisma/client|drizzle-orm|knex|mariadb|mongodb|mongoose|mysql|mysql2|neo4j-driver|pg|pg-promise|postgres|prisma|sequelize|typeorm';
const HTTP_FRAMEWORK_PACKAGES = 'express|fastify|koa|hapi|@hapi/hapi';
const DI_PACKAGES = 'inversify';
const APPLICATION_FORBIDDEN_PACKAGES = `^(${DRIVER_PACKAGES}|${HTTP_FRAMEWORK_PACKAGES})`;
const DOMAIN_FORBIDDEN_PACKAGES = `^(${DRIVER_PACKAGES}|${HTTP_FRAMEWORK_PACKAGES}|${DI_PACKAGES})`;

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
      comment: 'domain layer stays framework-, driver- and DI-free',
      from: {path: DOMAIN},
      name: 'domain-no-frameworks',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: DOMAIN_FORBIDDEN_PACKAGES}
    },
    {
      comment: 'application depends on ports (domain), never on adapters',
      from: {path: APPLICATION},
      name: 'application-no-infrastructure',
      severity: 'error',
      to: {path: INFRASTRUCTURE}
    },
    {
      comment: 'use cases speak to ports only — no HTTP framework, no database driver',
      from: {path: APPLICATION},
      name: 'application-stays-port-level',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: APPLICATION_FORBIDDEN_PACKAGES}
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
      comment: 'no dependency cycles anywhere',
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
      comment: 'every runtime import must be declared in package.json (no transitive freeloading)',
      from: {path: '^src/'},
      name: 'no-non-package-json',
      severity: 'error',
      to: {dependencyTypes: ['npm-no-pkg', 'npm-unknown']}
    }
    // Shared kernels (the root context-map.md declares them; the section is expected to be
    // empty). Every kernel added there gets ONE rule of this shape — an explicit consumer
    // allowlist. Template for a kernel `sharedKernel/<name>` consumed only by contextA and contextB:
    // {
    //   comment: 'sharedKernel/<name>: allowlisted consumers only (see context map)',
    //   from: {pathNot: '^src/(contextA|contextB)/'},
    //   name: 'shared-kernel-<name>-allowlist',
    //   severity: 'error',
    //   to: {path: '^src/sharedKernel/<name>/'}
    // }
  ],
  options: {
    doNotFollow: {path: 'node_modules'},
    tsConfig: {fileName: 'tsconfig.json'},
    tsPreCompilationDeps: true
  }
};
