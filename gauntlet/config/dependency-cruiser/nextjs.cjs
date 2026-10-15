// Architecture rules — Next.js (App Router) full-stack, CLEAN + hexagonal.
// Layout: src/app/** is the framework entry layer (routes, layouts, route handlers, server actions)
// and the composition root. Modules live in src/<module>/(1.0/)?{domain,application,infrastructure,ui,contract}.
// Client code lives in ui/ (and src/components/ for shared presentational pieces); server code in
// infrastructure/ and src/server/. dependency-cruiser cannot read the 'use client' directive, so the
// client/server boundary is enforced by path — pair it with the `server-only` / `client-only` packages.

const MODULE = '^src/(?!core/|app/|components/|server/)[^/]+/(?:1\\.0/)?';
const ANY_MODULE = '^src/[^/]+/(?:1\\.0/)?';

const DOMAIN = `${ANY_MODULE}domain`;
const APPLICATION = `${ANY_MODULE}application`;
const INFRASTRUCTURE = `${ANY_MODULE}infrastructure`;
const UI = `${ANY_MODULE}ui`;
const CONTRACT = `${ANY_MODULE}contract/`;

const CLIENT_CODE = `(${UI}|^src/components/)`;
const SERVER_CODE = `(${INFRASTRUCTURE}|^src/server/)`;

const FRAMEWORK_PACKAGES = '^(react|react-dom|next|next/.*|@tanstack/.*|zustand|jotai|swr|react-hook-form)$';
const SERVER_ONLY_PACKAGES = '^(next/headers|next/server|next/cache|server-only)$';
const DRIVER_PACKAGES =
  '^(@prisma/client|drizzle-orm|knex|mariadb|mongodb|mongoose|mysql|mysql2|neo4j-driver|pg|pg-promise|postgres|prisma|sequelize|typeorm|ioredis|redis|nodemailer|bcrypt|argon2|jsonwebtoken)';
const NODE_SERVER_BUILTINS = '^(node:)?(fs|fs/promises|child_process|crypto|net|tls|dns|cluster|worker_threads)$';

module.exports = {
  forbidden: [
    // ── hexagonal core ──────────────────────────────────────────────────────────────────────
    {
      comment: 'domain imports nothing from application, infrastructure or ui',
      from: {path: DOMAIN},
      name: 'domain-stays-pure',
      severity: 'error',
      to: {path: `${ANY_MODULE}(application|infrastructure|ui)`}
    },
    {
      comment: 'domain and application are framework-free (no React, no Next, no state libraries)',
      from: {path: `${ANY_MODULE}(domain|application)`},
      name: 'inner-layers-no-framework',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: FRAMEWORK_PACKAGES}
    },
    {
      comment: 'application depends on ports (domain), never on adapters or ui',
      from: {path: APPLICATION},
      name: 'application-no-adapters',
      severity: 'error',
      to: {path: `${ANY_MODULE}(infrastructure|ui)`}
    },
    {
      comment: 'domain and application never touch a database driver or crypto library directly',
      from: {path: `${ANY_MODULE}(domain|application)`},
      name: 'inner-layers-no-drivers',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: DRIVER_PACKAGES}
    },
    {
      comment: 'infrastructure never imports ui',
      from: {path: INFRASTRUCTURE},
      name: 'infrastructure-no-ui',
      severity: 'error',
      to: {path: UI}
    },

    // ── Next.js client/server boundary ──────────────────────────────────────────────────────
    {
      comment: 'client code never imports server code: adapters, src/server, server-only Next APIs',
      from: {path: CLIENT_CODE},
      name: 'client-no-server-code',
      severity: 'error',
      to: {path: SERVER_CODE}
    },
    {
      comment: 'client code never imports server-only Next modules or database/crypto drivers',
      from: {path: CLIENT_CODE},
      name: 'client-no-server-packages',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: `(${SERVER_ONLY_PACKAGES}|${DRIVER_PACKAGES})`}
    },
    {
      comment: 'client code never imports Node server builtins (fs, crypto, child_process, ...)',
      from: {path: CLIENT_CODE},
      name: 'client-no-node-builtins',
      severity: 'error',
      to: {dependencyTypes: ['core'], path: NODE_SERVER_BUILTINS}
    },
    {
      comment: 'ui reaches the application through ports and use cases, never through adapters',
      from: {path: UI},
      name: 'ui-no-infrastructure',
      severity: 'error',
      to: {path: INFRASTRUCTURE}
    },
    {
      comment: 'src/app is the entry layer: nothing imports a route, layout, action or handler file',
      from: {pathNot: '^src/app/'},
      name: 'nothing-imports-app-routes',
      severity: 'error',
      to: {path: '^src/app/'}
    },
    {
      comment: 'the app layer composes; it may import application, ui and infrastructure — but never domain internals except types via application',
      from: {path: '^src/app/'},
      name: 'app-layer-no-domain-entities',
      severity: 'warn',
      to: {path: `${DOMAIN}/entity/`}
    },

    // ── contexts, core, hygiene ─────────────────────────────────────────────────────────────
    {
      comment: 'a context may reach another context ONLY through its contract/ surface',
      from: {path: '^src/([^/]+)/(?:1\\.0/)?'},
      name: 'context-contract-only',
      severity: 'error',
      to: {path: '^src/(?!core/|app/|components/|server/)[^/]+/(?:1\\.0/)?(?!contract/)', pathNot: '^src/$1/(?:1\\.0/)?'}
    },
    {
      comment: 'contract/ exports primitives-only DTOs — never domain, application, infrastructure or ui',
      from: {path: CONTRACT},
      name: 'contract-stays-primitive',
      severity: 'error',
      to: {path: `${ANY_MODULE}(application|domain|infrastructure|ui)/`}
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
      comment: 'every runtime import must be declared in package.json',
      from: {path: '^src/'},
      name: 'no-non-package-json',
      severity: 'error',
      to: {dependencyTypes: ['npm-no-pkg', 'npm-unknown']}
    }
  ],
  options: {
    doNotFollow: {path: 'node_modules'},
    exclude: {path: '\\.(test|spec|stories)\\.(ts|tsx)$'},
    tsConfig: {fileName: 'tsconfig.json'},
    tsPreCompilationDeps: true
  }
};

// Referenced for documentation: the MODULE pattern names feature contexts only.
void MODULE;
