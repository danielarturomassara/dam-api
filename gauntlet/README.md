# The gauntlet kit

A quality gate for TypeScript projects that is copied verbatim between repositories: the pipeline, the protected-path policy, the Claude Code hooks, the git hook, the shared tool configurations and the templates that wire a project to all of it. Everything a project owns stays outside this directory.

## The rule behind the layout

Location tells a file's nature:

| where | what | copied? | protected? |
| --- | --- | --- | --- |
| `gauntlet/` | the kit: pipeline, policy, hooks, config bases, templates | verbatim, between projects | yes, one pattern |
| `gauntlet.json` | the project's declaration: `stack`, plus `project` and `service` when the repository has a dev container | written by `init`, updated once if the dev container is added later | yes |
| `.devcontainer/`, `docker/compose.yml`, `docker/.env.dist` | what runs on the developer's machine: the dev container, the compose services, the dev credentials | rendered by `init`, then owned | yes |
| root thin configs | `.dependency-cruiser.cjs`, `vitest.config.ts`, `stryker.config.mjs`, `eslint.config.mjs`, `cspell.json` — each imports its base from `gauntlet/config/` and holds only what differs (thresholds, exclusions, words) | seeded by `init`, then owned | all but `cspell.json` |
| `spec/` | `spec/approved/` holds the owner's binding specs, `spec/draft/` the agents' proposals; `init` seeds the blank templates they start from, `SPEC.template.md` and `context-map.template.md`, into `spec/template/` | templates seeded by `init`, then owned | `spec/approved/` only |
| `baseline/` | the project's frozen debt: `crap.json`, `depcruise.json`. Absent in a new project; only ever shrinks | never | yes |
| `report/` | disposable output: `coverage/`, `mutation/`, `stryker-incremental.json` | never, gitignored | no |

## Layout

```text
gauntlet/
├── .gitattributes                pins the kit to LF on every checkout (Windows hosts)
├── gauntlet.mjs                  the pipeline (protected entry point; --full, --only <step>)
├── crap.mjs                      CRAP per function, baseline-aware
├── checkProtectedChanges.mjs     CI consumer of the policy (authoritative)
├── protectedPaths.mjs            the policy — one list, three consumers
├── init.sh                       install into a project / --check (first pipeline step); bash, because it
│                                 runs on the host before the dev container — and Node — exists
├── config/
│   ├── stack.cjs                 reads and validates gauntlet.json — the only reader
│   ├── dependency-cruiser/       one rule set per stack + select.cjs
│   ├── vitest.ts  stryker.mjs  eslint.mjs  cspell.json   shared bases
│   └── complexity.eslint.mjs     isolated config crap.mjs uses to read cyclomatic complexity
├── hook/
│   ├── claude/                   Claude Code hooks (.claude/settings.json points here)
│   └── git/pre-push              git hook (core.hooksPath points here)
├── docker/
│   ├── Dockerfile                the development image, parameterized by NODE_VERSION and SERVICE_NAME
│   └── service/                  one compose file per service: app, mongodb, postgresql, mysql, neo4j
└── template/                     a project root: what init copies or renders
```

## The dev container

A project is the folder that holds its repositories (`dam`); each repository is one service inside it (`api`, `app`, `admin`) and has its own dev container. `init` asks for both names, recommends the parent folder and a service name by stack, and renders:

- `.devcontainer/devcontainer.json` from the template with the two names (a shim: `--check` renders it again from `gauntlet.json` and compares). The container path is `/workspace/<service>`, the `node_modules` volume is `<project>-<service>-node_modules`, and `postCreateCommand` runs three independent commands: the Claude Code install, `git config core.hooksPath gauntlet/hook/git`, and `npm install`, so a failed download never skips the hook wiring.
- `docker/compose.yml`, which extends the kit's `app` service under the repository's service name and, for server stacks (hex-api, nestjs, nextjs), the selected databases with `depends_on … service_healthy` and a named `<database>-data` volume where asked. Client stacks run themselves only.
- `docker/.env.dist`, committed: `COMPOSE_PROJECT_NAME` (the project name when sibling repositories share one compose project and network, which is the recommendation and what `COMPOSE_IGNORE_ORPHANS` is for; `<project>-<service>` when the repository is isolated), `NODE_VERSION` derived from `engines.node`, the service ports, and one block per selected database with the image's documented development credentials. `docker/.env` is its gitignored local copy, created when absent and never checked.

Every compose variable is declared as required, so a missing value stops compose naming the variable instead of producing an empty image tag. Inside a container `init` skips this part unless `--docker` is passed; `--no-docker` skips it anywhere. Database images: `mongo`, `postgres`, `mysql`, `neo4j`, each reachable at its service name from the app container.

Every published port binds to the host's loopback (`127.0.0.1`): the Node inspector on 9229 is remote code execution for anyone who can reach it, and the database credentials are the images' documented defaults. Local port choices belong in `docker/.env`, never in `.env.dist`: in shared mode every sibling repository must see the same database definition, or Compose recreates the shared container on every switch.

Shared mode has two consequences worth knowing. Closing one window stops the compose services it started, the shared database included (`shutdownAction` defaults to `stopCompose`); reopen the sibling, or `docker compose up -d` from its `docker/` folder. And two server repositories in one project both default to `SERVICE_PUBLIC_PORT=3000`; change one in its `.env.dist`.

`CLAUDE_CONFIG_DIR` points Claude Code at the `claude-code-config` volume so its account file survives a rebuild. On a Linux host whose user is not UID 1000, the `node_modules` volume keeps the image's ownership and `npm install` fails with EACCES: `updateRemoteUserUID` re-owns the home folder only.

`.devcontainer/**`, `docker/compose.yml` and `docker/.env.dist` are protected: they decide what runs on the developer's machine (mounts, privileges, images, credentials). The template's VS Code extension list is part of the dev container shim, so a project that needs another extension changes the template, which is a kit change for every project.

## What the kit assumes

- Sources in `src/`, tests in `test/` (`*.test.ts`), specs in `spec/` with `spec/approved/` owner-only.
- `tsconfig.json` at the root; `package.json` with `engines.node` (CI reads the Node version from it).
- Directory names are singular (`entity/`, `useCase/`, `baseline/`, `report/`); tool-dictated paths and gitignored output are exempt.
- Node 22 or newer (`import.meta.dirname`, `require` of `.cjs` from ESM); exercised on Node 26. The one exception is `init.sh`: bash 3.2 or newer (what macOS ships) with awk, sed, find, sort and cmp, plus git for `--check`, because installing the kit happens on the host before the dev container — and its Node — exists. On Windows run it from Git Bash or WSL; `gauntlet/.gitattributes` pins the kit to LF so a `core.autocrlf` checkout cannot break the scripts or the git hook.
- The kit is COPIED into `<project>/gauntlet`, never symlinked: `stack.cjs` finds the project root from its own location, so a symlink would read another project's `gauntlet.json`.

## Install into a project

```sh
# copy this directory to <project>/gauntlet, then:
bash gauntlet/init.sh                                                    # asks: stack, project, service, databases
bash gauntlet/init.sh --stack hex-api --project shop --database mongodb  # scripts pass every answer that has no safe default
```

`init` inspects the project — package.json dependencies, `next.config.*`, `nest-cli.json`, `vite.config.*` and the Vite plugin the config text names — and, on a terminal, lists every known stack with the detected ones first and their evidence. One detected stack is the recommended default and Enter accepts it; several detected stacks mean no default. Without a terminal there is no prompt: exactly one detected stack is used, anything else stops and asks for `--stack`. A framework-less Node API (express, fastify, koa, hapi or inversify, and no framework sign) is reported as `hex-api`; nothing is ever assumed when no sign matches.

It then copies every template file that is absent, never overwrites an existing file (the one exception: `gauntlet.json` gains `project` and `service` when the dev container is added to an installed project), appends the gitignore entries and prints the manual steps: `chmod +x gauntlet/hook/git/pre-push` and `git config core.hooksPath gauntlet/hook/git`, the npm scripts, the devDependencies below, a review of the seeded thresholds. Run `bash gauntlet/init.sh --check` and then `node gauntlet/gauntlet.mjs`. `--check` also verifies the git hook is executable and that `core.hooksPath` points at the kit (the latter is skipped under CI, where the setting never exists), and prints a note, never a failure, when the project no longer looks like its declared stack. Any argument `init` does not know is an error.

devDependencies the kit needs (pin exact versions): `@stryker-mutator/core`, `@stryker-mutator/vitest-runner`, `@stylistic/eslint-plugin`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@vitest/coverage-v8`, `cspell`, `dependency-cruiser`, `eslint`, `eslint-plugin-jsonc`, `eslint-plugin-perfectionist`, `eslint-plugin-sonarjs`, `eslint-plugin-unused-imports`, `typescript`, `vite-tsconfig-paths`, `vitest`. Browser stacks add `jsdom` and their framework plugin (passed through `plugins` in `vitest.config.ts`).

### Shims and seeds

`template/` holds two kinds of files. **Shims** only point at the kit and are byte-identical in every project: the workflows, `.claude/settings.json`, the gauntlet command, `.dependency-cruiser.cjs`, and the dev container file, which is rendered with the project and service names. `init --check` compares them byte for byte, so a drifted shim is a red gauntlet; change the template, then the live copy. **Seeds** are copied once and then owned: the thin tool configs, the adversarial-reviewer agent, the testing rules (`.claude/rules/testing.md`), the code-style skill (`.claude/skills/code-style/SKILL.md`), the blank spec templates (`spec/template/SPEC.template.md`, `spec/template/context-map.template.md`), the dev container feature lock. `--check` only requires them to exist. **Generated** files are rendered from the answers and then owned: `gauntlet.json`, `docker/compose.yml`, `docker/.env.dist`.

## The pipeline

`node gauntlet/gauntlet.mjs` runs, in order: template-sync (`bash gauntlet/init.sh --check`) → type-check → lint → cspell → test-coverage → depcruise → crap. `--full` appends mutation; `--only <step>` runs one step with exactly the pipeline's arguments. Exit code is the failing step's.

## Stack support

| stack | dependency-cruiser | vitest base | notes |
| --- | --- | --- | --- |
| `hex-api` | yes | yes, in use | this repository |
| `nestjs` | yes | yes (same as hex-api) | |
| `nextjs`, `vite-react` | yes | node + jsdom projects, type-checked only | needs `jsdom`; no runtime project yet |
| `vite-vue` | yes | node + jsdom projects, type-checked only | needs `jsdom`, `@vitejs/plugin-vue` through `plugins`; `.vue` files need the project's own ESLint entries |

The stack lives in `gauntlet.json`, a committed and protected file, never in the environment and never detected at run time: the gate's definition must be identical on every machine and in CI, it must be something the policy can protect, and it must not change because a dependency was added for an experiment. `init` inspects the project once to recommend a stack; after that the file is the truth and `--check` only notes a disagreement.

## Owner commands

- `npm run baseline:crap` — regenerate `baseline/crap.json` from the current CRAP report.
- `npm run baseline:depcruise` — regenerate `baseline/depcruise.json`.
- `GAUNTLET_ALLOW_PROTECTED_EDITS=1` in the shell before launching Claude Code — bulk escape hatch for the hooks; relaunch without it afterwards. It cannot be flipped from inside a session.

## Enforcement, weakest to strongest

1. **Hooks** (in-session; can be bypassed by construction). Edit/Write on a protected path prompts the owner with a diff. A Bash command that names a protected path and contains a content-write indicator anywhere (redirection, tee, sed -i, cp, the baseline writers, git writes) is denied with a pointer to Edit — so capture output with `2>&1 | tail`, never a redirection; one that names a protected path and contains `mv`/`rm` prompts the owner, since Edit has no equivalent and the command text is the whole effect. The Stop hook reruns the pipeline when the session changed the gate's inputs (`src/`, `test/`, `spec/`) or its definition (the kit, `baseline/`, the root thin configs, the shims).
2. **`hook/git/pre-push`** runs the pipeline before any push.
3. **CI** (authoritative): `checkProtectedChanges.mjs` fails any PR touching a protected path unless it carries the `protected-approved` label; the gauntlet workflow runs the pipeline and, separately, mutation testing.
