# CLAUDE.md — API

Modular, monolith-first, hexagonal architecture, Express + InversifyJS, strict ESM.
Persistence is decoupled behind domain ports with per-technology adapters (PostgreSQL,
MySQL, MongoDB, Neo4j) — one or several per project, selected in DI wiring. Domain never
sees a driver. Modules are bounded contexts and extraction-ready service candidates.
**Style and architecture rules live in the `code-style` skill — always apply it.** This
file covers workflow and quality gates only. Do not duplicate skill content here.

## Commands

- `npm run type-check` / `npm run lint` / `npm run lint-fix` / `npm run cspell`
- `npm run test` / `npm run test:coverage` — Vitest (+ v8 coverage with thresholds)
- `npm run test:mutation` — StrykerJS (slow; run via `/gauntlet --full` or CI)
- `npm run depcruise` — architecture rules (layer direction, context contracts, core isolation)
- `npm run crap` — CRAP per function: `CC² · (1 − coverage)³ + CC`. Fails on NEW
  offenders above 8; `baseline/crap.json` tolerates the pre-test backlog (as long as an
  entry does not get worse) and only ever shrinks. The owner regenerates it with
  `npm run baseline:crap`.
- `node gauntlet/gauntlet.mjs` — the full fast gate (protected pipeline), in order:
  template-sync → type-check → lint → cspell → test-coverage → depcruise
  (`baseline/depcruise.json` shrink-only) → crap. `npm run gauntlet` wraps it for humans;
  hooks, pre-push and CI call the script directly. `--only <step>` runs one step.
- `node gauntlet/gauntlet.mjs --full` (`npm run gauntlet:full`) — gauntlet + mutation

## Working agreement (non-negotiable)

1. **Specs first.** `spec/approved/` is authored by the owner only. If implementation and spec
   disagree, the spec wins. Agents propose spec changes as drafts in `spec/draft/`, started
   from the blank templates in `spec/template/`; the owner moves an approved draft into
   `spec/approved/`. Never edit an approved spec.
2. **Test immutability.** You may CREATE new test files — that is the expected fix for
   coverage, CRAP, and mutation failures. You may not MODIFY or DELETE an existing test.
   To change one, propose it and stop.
3. **Done = gauntlet green.** Run `/gauntlet` before declaring any task complete. Never
   weaken thresholds, configs, baselines, or protected files to reach green, and never
   work around the hooks that block those edits.
4. **No silent fallbacks.** No catch-and-continue, no default-on-parse-failure, no `any`
   escapes, no swallowed promise rejections. Fail loudly with domain errors from `@core`.
5. **When a check fails, fix the code, not the check.**
6. **Contexts and sharing.** Modules are bounded contexts — apply SKILL §15
   (contract-only imports, data ownership, snapshot seams, the sharing ladder), and read
   `spec/approved/context-map.md` before touching any cross-context seam.
7. Before finishing significant changes, invoke the `adversarial-reviewer` subagent on
   the diff and address its findings.
8. **Git is read-only for agents.** Never run any git command that writes state (commit, add,
   push, restore, stash, checkout, ...). The owner makes every commit by hand. The only two git
   commands agents need are `git log` and `git diff`.

## Protected paths and enforcement

The gauntlet is a kit copied verbatim between projects: `gauntlet/` holds the pipeline, the
policy, the hooks, the shared tool configs, the dev container (Dockerfile and compose service
definitions) and the templates (read `gauntlet/README.md`).
Location tells a file's nature: `gauntlet/` is copied; `gauntlet.json` (stack, project,
service) and the thin root configs are the project's declarations; `baseline/` is the
project's frozen debt; `.devcontainer/` and `docker/` decide what runs on the developer's
machine; `report/` is disposable output.

The policy lives in `gauntlet/protectedPaths.mjs` — one list, imported by the hooks AND
by CI. Fully protected (any change needs the owner): `gauntlet/**`, `baseline/**`,
`gauntlet.json`, `.dependency-cruiser.cjs`, `vitest.config.ts`, `stryker.config.mjs`,
`eslint.config.mjs`, `.devcontainer/**`, `docker/compose.yml`, `docker/.env.dist`,
`.github/workflows/**`, `.claude/settings.json`, `.claude/settings.local.json`,
`spec/approved/**`, `*.feature`. Existing files under `test/**` are immutable; creating new
tests is allowed and expected.
Review-required in CI only (hooks stay silent): `tsconfig.json`, `.npmrc` block without
the label; `package.json`, `cspell.json` emit a warning annotation.

Enforcement layers, weakest to strongest:

1. PreToolUse hooks — in-session ergonomics that can be bypassed by construction. Do not
   try; CI catches it. Edit/Write on a protected path prompts the owner with a diff. A Bash
   command that names a protected path AND contains a content-write indicator anywhere
   (redirection, tee, sed -i, cp, the baseline writers, git writes) is denied: use Edit, and
   capture output with `2>&1 | tail`, never a redirection. A Bash command that names a
   protected path and contains `mv`/`rm` prompts the owner — Edit has no equivalent and the
   command text is the whole effect.
2. `gauntlet/hook/git/pre-push` runs the gauntlet locally before any push.
3. **CI is the authoritative gate**: the `protected-paths` job fails any PR touching
   protected paths (including renames of existing tests) unless the owner reviews the
   changes and adds the `protected-approved` label.

Escape hatch (owner only): set `GAUNTLET_ALLOW_PROTECTED_EDITS=1` in the shell BEFORE
launching Claude Code; relaunch without it for normal sessions. It cannot be flipped
from inside a session.
