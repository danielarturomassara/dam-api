# Dependency-cruiser rule sets — CLEAN + hexagonal, per stack

One file per stack. `select.cjs` picks the one named by the project's `gauntlet.json`; the project's root `.dependency-cruiser.cjs` is a one-line `require` of the selector and is byte-identical in every project. Run `depcruise src` from the project root. Every set shares the same hexagonal core and adds only the boundary its framework introduces.

## The shared skeleton every set assumes

```text
src/
├── core/                       # cross-project standard library (@core): no business concept, imports no feature
├── <module>/                   # one bounded context; optional version segment: <module>/1.0/
│   ├── domain/                 # entities, value objects, errors, PORTS (interface + token)
│   ├── application/            # use cases, strategies — ports only, never adapters
│   ├── infrastructure/         # driven adapters: persistence, http clients, messaging, config
│   ├── ui/                     # driving adapters for frontends: components, hooks/composables, view state
│   └── contract/               # primitives-only DTOs/enums other contexts may import
└── <composition root>          # stack-specific: wires adapters to ports (see each set)
```

Rules common to all sets: domain imports nothing from application/infrastructure/ui and no framework; application depends on ports only (no infrastructure, no ui, no framework except the DI decorator package where the stack needs one); infrastructure never imports ui; cross-context imports go through `contract/` only; `core` never imports a feature; no cycles; no devDependency at runtime; every runtime import declared in `package.json`.

## What each stack adds

| stack | file | the boundary that matters | not enforceable by depcruise — pair it with |
| --- | --- | --- | --- |
| Hexagonal Node API | `hex-api.cjs` | `dependencyContainerModule.ts` per module is the composition root; the HTTP framework and every driver only in `infrastructure/`; the DI package allowed in `application/`, forbidden in `domain/` | the container smoke test (every binding resolves with its chain) — a DI container fails at resolution time, not at build time. |
| Next.js (App Router) | `nextjs.cjs` | client code (`ui/`, `src/components/`) never imports server code (`infrastructure/`, `src/server/`, drivers, `next/headers`); nothing imports `src/app/` (routes are entry points) | the `server-only` / `client-only` packages imported at the top of `infrastructure/` and `ui/` index files — Next's build then rejects the wrong bundle even for a file that dodges the path convention. dependency-cruiser cannot read the `'use client'` directive, so the rule is path-based: client components live in `ui/` or `src/components/`. |
| Vite + React | `vite-react.cjs` | `ui/` reaches ports only (through context/DI in `src/main.tsx`), never adapters; React and state libraries confined to `ui/` | the vitest base's jsdom project for `test/**/ui/**`; node elsewhere |
| Vite + Vue | `vite-vue.cjs` | same as React with Vue, Pinia and vue-router confined to `ui/`; `.vue` files are parsed (script block) | same vitest split; Pinia stores are `ui/` state, not application state |
| NestJS | `nestjs.cjs` | `*.module.ts` is the only composition root; application may use `@nestjs/common` decorators only; ORMs/drivers and every other `@nestjs/*` package live in `infrastructure/` | Nest's own DI resolution errors at boot (missing providers) — keep a container smoke test per module |

## Versioned modules

Every path pattern accepts an optional `1.0/` segment (`src/account/1.0/domain` and `src/account/domain` both match), so the sets work with and without the versioned layout used in the API repo.
