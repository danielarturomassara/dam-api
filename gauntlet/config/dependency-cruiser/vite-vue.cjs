// Architecture rules — Vite + Vue 3 SPA, CLEAN + hexagonal.
// Layout: src/main.ts is the composition root (builds adapters, provides ports with app.provide /
// a typed injection key). Modules live in src/<module>/(1.0/)?{domain,application,infrastructure,ui,contract}:
// ui/ holds .vue components, composables and Pinia stores (view state); infrastructure/ holds http
// clients, storage and other driven adapters; application/ holds use cases that speak to ports only.
// dependency-cruiser reads the <script> block of .vue single-file components.

const ANY_MODULE = '^src/[^/]+/(?:1\\.0/)?';

const DOMAIN = `${ANY_MODULE}domain`;
const APPLICATION = `${ANY_MODULE}application`;
const INFRASTRUCTURE = `${ANY_MODULE}infrastructure`;
const UI = `${ANY_MODULE}ui`;
const CONTRACT = `${ANY_MODULE}contract/`;

const VUE_PACKAGES = '^(vue|vue-router|pinia|@vueuse/.*|vuetify|primevue|quasar|@tanstack/vue-query|vee-validate)$';
const IO_PACKAGES = '^(axios|ky|got|socket\\.io-client|graphql-request|@apollo/client|firebase|@supabase/.*)';

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
      comment: 'domain and application are framework-free: no Vue, no router, no Pinia',
      from: {path: `${ANY_MODULE}(domain|application)`},
      name: 'inner-layers-no-vue',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: VUE_PACKAGES}
    },
    {
      comment: 'domain and application never perform I/O themselves (http clients, sockets, BaaS SDKs)',
      from: {path: `${ANY_MODULE}(domain|application)`},
      name: 'inner-layers-no-io',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: IO_PACKAGES}
    },
    {
      comment: 'domain and application never import a single-file component',
      from: {path: `${ANY_MODULE}(domain|application)`},
      name: 'inner-layers-no-components',
      severity: 'error',
      to: {path: '\\.vue$'}
    },
    {
      comment: 'application depends on ports (domain), never on adapters or ui',
      from: {path: APPLICATION},
      name: 'application-no-adapters',
      severity: 'error',
      to: {path: `${ANY_MODULE}(infrastructure|ui)`}
    },
    {
      comment: 'infrastructure never imports ui',
      from: {path: INFRASTRUCTURE},
      name: 'infrastructure-no-ui',
      severity: 'error',
      to: {path: UI}
    },
    {
      comment: 'driven adapters are framework-free too: Vue belongs to ui',
      from: {path: INFRASTRUCTURE},
      name: 'infrastructure-no-vue',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: VUE_PACKAGES}
    },

    // ── the UI boundary ─────────────────────────────────────────────────────────────────────
    {
      comment: 'ui (components, composables, stores) reaches the application through ports and use cases, never through adapters',
      from: {path: UI},
      name: 'ui-no-infrastructure',
      severity: 'error',
      to: {path: INFRASTRUCTURE}
    },
    {
      comment: 'ui never performs I/O itself: data enters through a port adapter, not an axios call in a composable or store',
      from: {path: UI},
      name: 'ui-no-io',
      severity: 'error',
      to: {dependencyTypes: ['npm'], path: IO_PACKAGES}
    },
    {
      comment: 'only the composition root (src/main.ts) and infrastructure may name concrete adapters',
      from: {pathNot: `(^src/main\\.ts$|${INFRASTRUCTURE})`},
      name: 'adapters-only-from-composition-root',
      severity: 'error',
      to: {path: `${INFRASTRUCTURE}/`}
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
    exclude: {path: '\\.(test|spec|stories)\\.ts$'},
    extraExtensionsToScan: ['.vue'],
    tsConfig: {fileName: 'tsconfig.json'},
    tsPreCompilationDeps: true
  }
};
