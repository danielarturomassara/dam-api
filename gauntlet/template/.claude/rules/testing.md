---
paths: ["test/**", "vitest.config.ts", "stryker.config.mjs"]
---

# Testing conventions

- **Tests come first.** A behavior is written as a failing test derived from its spec rule
  before any source exists for it (code-style skill §14). Source written ahead of its test is
  not done; it is a draft awaiting its test.

- Tests mirror the source tree: src/account/1.0/domain/valueObject/Email.ts →
  test/account/1.0/domain/valueObject/Email.test.ts. One describe per class.
- Framework: Vitest. Property-based testing: fast-check.
- **Value objects** get property tests: all valid domain values are accepted, invariants
  hold after construction, invalid values throw InvalidArgument. Example shape:
  fc.assert(fc.property(fc.emailAddress(), (address) => { ... })).
- **Use cases** are tested against in-memory doubles: a small class implementing the port
  interface (no mocking libraries). Assert observable behavior and thrown domain errors,
  never call sequences or private state.
- **Persistence adapters** get contract tests: one shared suite per port, run against
  every adapter of that port (mongodb-memory-server for Mongo — needs no Docker;
  Testcontainers for PostgreSQL, MySQL and Neo4j when the environment provides
  Docker access — the current devcontainer does not). Passing the port's contract
  suite is the definition of a correct adapter, whatever the technology.
- **The container smoke test comes first**: `dependencyContainer.get()` for every
  binding. Cheapest test in the repo; catches unbound DI chains and
  decorator-metadata regressions (esbuild emits no design:paramtypes) in one file.
- Never use snapshots for logic. Never assert on .value of value objects — use
  toPrimitives().
- Coverage and mutation thresholds only ever ratchet UP. Lowering one is a blocked change.
- **Characterization first**: before refactoring behavior that is live in production,
  write characterization tests pinning current observable behavior. They are the
  harness that makes the refactor safe; removing them afterwards needs the owner's
  sign-off like any other test change.
- **Cross-context contract tests**: every `contract/` surface gets a consumer-driven
  suite derived from its spec §3 (Contract). At extraction, the same suite runs
  against the extracted service's HTTP surface — the suite, not the transport,
  defines the contract.
- If an existing test fails after a source change, the test is the spec: propose the test
  change to the owner as a regression impact matrix (code-style skill §14) and stop. Do not
  patch the test.
- **HTTP contract suites**: every endpoint table in a spec §3 gets an HTTP-level suite that
  drives the real Express stack with doubled adapters, one case per response row (status, body
  shape, body text). Handler unit tests do not replace it — only the real stack proves the
  middleware order, the body parsing and the error mapping together.
