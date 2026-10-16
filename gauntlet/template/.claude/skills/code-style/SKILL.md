---
name: code-style
description: Code style and architecture conventions for this TypeScript Node API. Use whenever writing, refactoring, or reviewing TypeScript in this repo — new modules, entities, value objects, use cases, HTTP handlers, repositories, or DI wiring must follow these patterns.
---

# Code style — API

Modular, monolith-first, hexagonal architecture (DDD-lite), Express, InversifyJS, strict ESM.
Persistence is multi-database via adapters (PostgreSQL, MySQL, MongoDB, Neo4j — one or several
per project). Modules are bounded contexts and extraction-ready service candidates (§15).
`package.json` is the only source of truth for versions, and dependency versions are EXACT —
never `^` or `~` ranges (no silent minor-update breakage).
When in doubt, imitate the exemplar file cited in each section. `npm run lint-fix` settles all
formatting and member-ordering questions — run it before considering any change done.

**Guiding principle: agent readable first, human readable second — but always readable.**
Code here is parsed and modified by AI agents and tooling as much as by people. Everything is
explicit, descriptive, and convention-regular: no cleverness that needs surrounding context to
decode, no abbreviations that need a human's memory to expand, no implicit conventions that only
show up in review comments. If a rule in this file conflicts with brevity, the rule wins.

## 0. Hexagonal architecture

Every module is a hexagon: a domain in the middle, an application layer around it, adapters on
the outside. The invariants, each detailed in the section cited:

- **Domain** (`domain/`) holds entities, value objects, domain errors and the PORTS — an
  interface plus its `Symbol.for` token in one file (§2). It imports nothing from application or
  infrastructure and nothing framework-specific (§1).
- **Application** (`application/`) holds use cases and strategies. It depends on ports only —
  never on adapters, drivers, Express, or another module's internals (§7).
- **Infrastructure** (`infrastructure/`) holds the ADAPTERS: one class per port per technology,
  named `<Port><Technology>`, `@injectable`, under `infrastructure/<technology>/` (§2, §9). HTTP
  handlers, routers and middleware are adapters too (§8).
- Dependencies point inward only: `infrastructure → application → domain` (§1);
  dependency-cruiser enforces it.
- The port is the contract: it never changes with the technology, it speaks value objects and
  primitives, and every adapter of it passes the port's shared contract test suite (§9).
- A port owns its vocabulary; an adapter translates it into its library's own (level names,
  status names, option names). Library vocabulary never appears in a port or in configuration.
- Adapters are chosen in DI wiring only (`dependencyContainerModule.ts`, §2, §9): swapping a
  technology is a binding change, never a change in domain or application.
- A need for another context is a port too: define it in the needing module's domain and let an
  in-process adapter call the other context (§15).
- Each spec lists its module's ports and the adapter bound to each (spec §3 "Ports and adapters").

## 1. Module layout

Every feature is a versioned module: `src/<module>/1.0/` with three layers plus an optional
published surface.

```text
src/<module>/1.0/
├── application/
│   ├── dto/                  # use-case input/output interfaces
│   └── useCase/              # one class per action
├── contract/                 # primitives-only DTOs/enums other contexts may import (§15; none exist yet — the first consumer creates it)
├── dependencyContainerModule.ts
├── domain/
│   ├── <PortName>.ts         # interface + Symbol token
│   ├── entity/
│   ├── error/                # module-specific domain errors (rare; usually reuse @core)
│   └── valueObject/
└── infrastructure/
    ├── http/                 # ModuleRouter.ts, handler/, validator/
    └── <technology>/         # <Port><Technology> adapters (postgresql/, mongodb/, neo4j/, ...)
```

This diagram is the TARGET layout. Legacy modules vary (account uses
`infrastructure/self/http/`; some use cases sit directly in `application/`) — do NOT
opportunistically "fix" that variance outside the task at hand.

Rules:

- Spec files are named `<subject>.spec.md` (e.g. `spec/approved/account.spec.md`) — the
  `.spec.md` suffix is what marks a document as a binding specification; a plain `.md` under
  `spec/` is a template or working note, not a spec. `spec/approved/` is binding and owner-only;
  `spec/draft/` holds agent-written proposals awaiting the owner.
- A spec (or a spec draft an agent writes for the owner) describes the target, never the status:
  no `[implemented]`/`[pending]` markers, no "currently"/"already" — implementation status lives in
  the tests and the gauntlet, and a spec sentence must read the same the day it is written and
  five years later.
- Register an alias in `tsconfig.json`: `"@<module>/*": ["./src/<module>/1.0/*"]` (targets are relative to the tsconfig file; there is no `baseUrl`).
- All imports use aliases (`@core/...`, `@account/...`), never relative `../` paths, and every
  import specifier ends in `.js` (NodeNext ESM).
- Dependency direction: `infrastructure → application → domain`. Domain imports nothing from
  application or infrastructure, and nothing framework-specific. Feature modules may import
  `@core`; **core must never import from a feature module**. Feature→feature imports go only
  through the other context's `contract/` (§15).
- One export per file; the file is named exactly after its export (`Account.ts` exports `Account`).

## 2. Dependency injection (InversifyJS)

**Port + token** — the interface and its Symbol token live together in `domain/`
(exemplar: `src/account/1.0/domain/Encrypter.ts`):

```ts
export interface Encrypter {
  compare (plainText: string, hashedText: string): Promise<boolean>;
  encrypt (plainText: string): Promise<string>;
}

export const ENCRYPTER = Symbol.for('Encrypter');
```

**Adapter** — named `<Port><Technology>` (`EncrypterBcrypt`, `AccountRepositoryMongo`,
`LoggerWinston`), decorated `@injectable()`, placed under `infrastructure/<technology>/`.

**Wiring** — each module owns a `dependencyContainerModule.ts` default-exporting a
`ContainerModule`; it is auto-discovered by `src/dependencyContainer.ts` (never edit the root
container to add a module):

```ts
export default new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind<Encrypter>(ENCRYPTER).to(EncrypterBcrypt).inSingletonScope();
});
```

- Constructor injection only: `@inject(TOKEN) private readonly dep: PortInterface`.
- **Every class declares its OWN constructor**, and a subclass constructor calls `super(...)`
  re-declaring every base dependency with its explicit `@inject` — Inversify 7 reads a class's own
  constructor metadata only; a subclass without one resolves with the base dependencies undefined.
  The container smoke test pins this.
- `.inSingletonScope()` for stateful infrastructure (config, loggers, connections).
- **Every class you resolve — and its full dependency chain — must be bound in some module.**
  Missing bindings fail at runtime only; check the chain when adding a use case.
- **Every constructor parameter carries an explicit `@inject(TOKEN)`.** A bare
  class-typed parameter resolves under tsx (`emitDecoratorMetadata`) but fails under
  Vitest (esbuild never emits `design:paramtypes`). The container smoke test catches
  this class of regression.

## 3. Value objects

Extend `ValueObject<T>` or `TrimmedString`. Private constructor, static factories, self-validation
throwing `InvalidArgument`. Exemplars: `src/core/1.0/domain/valueObject/Email.ts`, `Phone.ts`, `Uuid.ts`.

```ts
export class Email extends TrimmedString {
  private static readonly emailRegExp = /.../;

  public static fromPrimitives (primitives: string): Email {
    return new Email(primitives);
  }

  private constructor (value: string) {
    super(value);

    this.ensureIsValidEmail();
  }

  private ensureIsValidEmail (): void {
    if (!Email.emailRegExp.test(this.value)) {
      throw new InvalidArgument({value: this.value, valueObjectName: this.constructor.name});
    }
  }
}
```

- Validation methods are named `ensureIsValid<X>` / `ensure<Condition>`.
- The rejection names the value object with `this.constructor.name`, never a string literal: an
  inherited guard must report the concrete subclass, and the name is only read on the failure
  path, so there is nothing to optimize.
- Unwrap only at boundaries via `toPrimitives()`. Never expose `.value`.
- Reuse `@core` value objects (Email, Phone, Uuid, Url, TrimmedString, Names, Time, LanguageTag)
  before creating new ones.

## 4. Entities

Entities extend one rung of the base-entity ladder in `@core/domain/entity/` — every entity has
an id; timestamps and soft delete are opt-in by picking the rung:

| rung | fields | when |
|---|---|---|
| `BaseEntity` | `id` | rare — records with no lifecycle |
| `TimestampedEntity` | + `createdAt`, `updatedAt` | **the default for most entities** |
| `AuditedEntity` | + `deletedAt`, with `delete()`/`restore()`/`isDeleted()` guards | when soft delete is required |

Each rung has a matching `<Rung>Primitives` interface and a `buildNew()` that composes the chain.
Exemplar: `src/account/1.0/domain/entity/Account.ts` (a `TimestampedEntity` whose `disabledAt` is
its own enabled/disabled lifecycle — spec/approved/account.spec.md §4.1 pins the rung).

```ts
export interface ThingPrimitives extends TimestampedEntityPrimitives {
  name: string;
}

export type CreateThingPrimitives = Omit<ThingPrimitives, keyof TimestampedEntityPrimitives>;

export class Thing extends TimestampedEntity {
  public readonly name: TrimmedString;

  public static create (primitives: CreateThingPrimitives): Thing {
    return new Thing({...TimestampedEntity.buildNew(), ...primitives});
  }

  public static fromPrimitives (primitives: ThingPrimitives): Thing {
    return new Thing(primitives);
  }

  public toPrimitives (): ThingPrimitives {
    return {...super.toPrimitives(), name: this.name.toPrimitives()};
  }

  private constructor (primitives: ThingPrimitives) {
    super(primitives);

    this.name = TrimmedString.fromPrimitives(primitives.name);
  }
}
```

- Fields hold value objects; the `Primitives` interface holds raw types. The private constructor
  hydrates, `toPrimitives()` dehydrates.
- State transitions are entity methods with guard clauses throwing domain errors
  (exemplars: `AuditedEntity.delete()/restore()`, `BaseIdentity.disable()/verify()` in
  `src/account/1.0/domain/entity/BaseIdentity.ts`).
- Never set `deletedAt` by hand — the `AuditedEntity` methods own that invariant.
- Optional persisted fields are `Nullable<X>` (`@core/domain/type/Nullable.js`), never `undefined`.
- Do not add a mixin layer or extra rungs speculatively; a new rung needs a real entity that
  requires it.

## 5. Variant types (discriminated unions)

For families of related shapes (e.g. identity providers), do NOT build inheritance trees for
consumers — build a discriminated union. Exemplar: `src/account/1.0/domain/entity/Identity.ts`.

- Literal discriminant: `provider: IDENTITY_PROVIDERS.PASSWORD`.
- Exclude foreign fields with `?: never` so variants are mutually exclusive.
- Union both the classes and the primitives: `type Identity = A | B | ...`.
- Factory/registry maps must be checked with `satisfies Record<ENUM, Resolver>` so adding an enum
  member is a compile error until every registry is updated.
- **Factories are for HYDRATION ONLY**: a `fromPrimitives` switch narrowing runtime-discriminated
  data (stored documents, queue payloads) — never `as`-casts. Code that statically knows the
  variant calls the concrete class's `create` directly; a generic factory `create` over the union
  is forbidden. Behavioral variation per discriminant is a strategy selected in DI wiring (§7),
  not a factory. Exemplar: `src/account/1.0/domain/entity/IdentityFactory.ts`.
- **Switches live only in hydration factories.** A `default:` branch disables compile-time
  exhaustiveness, so every other dispatch over an enum is a `satisfies Record` registry (which
  keeps it); guard registry lookups keyed by untrusted strings with `Object.hasOwn` (§10). Inside
  a narrowing switch, copy the discriminant to an `unknown` variable BEFORE the switch — in
  `default` the input is narrowed to `never`, and the copy is what names the runtime value in the
  error. Untrusted input never narrows a union — it is PARSED into one (per-provider zod schemas,
  exemplar: `application/useCase/registration/FieldSchemas.ts`).

## 6. Errors

- Throw domain errors from `@core/domain/error/`: `InvalidArgument`, `Conflict`, `NotFound`, `Unauthorized`, `Forbidden`, `ServerError`, and `NotImplemented`. Domain/application code never touches HTTP codes.
- HTTP status mapping happens only in the Express error middleware
  (`src/core/1.0/infrastructure/http/handler/errorHandler.ts`).
- `InvalidArgument` takes `{value, valueObjectName}` for VO failures or `{customMessage}` for validator messages.

## 7. Use cases (application layer)

One class per action with a single public `run(input): Promise<Output>`. Input DTO is an interface in `application/dto/`. Dispatcher exemplar: `src/account/1.0/application/useCase/Register.ts`;
flow exemplar: `src/account/1.0/application/useCase/registration/PasswordRegistration.ts`.

```ts
@injectable()
export class PasswordRegistration implements RegistrationStrategy {
  public constructor (
    @inject(ENCRYPTER) private readonly encrypter: Encrypter,
    @inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository
  ) {}

  public async register (input: RegisterInput): Promise<Account> {
    // guard clauses first, then the happy path
  }

  private async checkIfEmailAlreadyExists (emailString: string): Promise<void> { ... }
}
```

- Decompose the public method into sentence-named private helpers (`checkIfEmailAlreadyExists`) while they are narrative steps of ONE flow — that shape is healthy, do not atomize it into one-method service files.
- **Strategy extraction**: when the private helpers cluster by a discriminant (per provider, per channel, per driver) or drag in disjoint dependency subsets, the class is hiding several use cases. Extract one strategy class per cluster into a subfolder beside the use case (e.g. `application/useCase/registration/`), with the interface + registry type + Symbol token in one `<Action>Strategy.ts`. The registry is assembled in `dependencyContainerModule.ts` (`satisfies Record<ENUM, Strategy>`, §5) — wiring plays the factory role — and the use case stays a thin dispatcher. Each strategy receives the full input union and narrows on the discriminant itself, failing a foreign variant loudly with `ServerError`.
- Depend on ports only — never on adapters or Express types.
- Do not extend the `UseCase` base class (legacy; see §13).

## 8. HTTP layer

**Handler** (`infrastructure/http/handler/<action>.ts`) — default-exported async arrow function.
Exemplar: `src/account/1.0/infrastructure/self/http/handler/register.ts`.

```ts
export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const sanitizedRequest = sanitizeRequest(request.body);

    ActionValidator.validate(sanitizedRequest);

    const useCase = dependencyContainer.get<Action>(Action);

    await useCase.run(sanitizedRequest);

    response.status(HTTP_SUCCESS_CODES.CREATED).end();
  } catch (error) {
    next(error);
  }
};
```

- `sanitizeRequest` whitelists expected body fields (destructure, never spread the raw body) and
  normalizes with `@core/application/stringFormatter` helpers (`formatEmail`, `formatE164`).
- Status codes always come from the `HTTP_*_CODES` enums in `@core/domain/type/HttpCodes.js` —
  never numeric literals.
- An empty-body response is `status(...).end()`, never `sendStatus()` — Express writes the status
  text as the body.
- All failures propagate via `next(error)`; handlers never write error responses themselves.
- Resolve every dependency the `catch` block needs BEFORE the `try` — a failing resolution inside
  `catch` leaves the request unanswered.
- Express recognizes error middleware by its declared **arity of four**: never remove an unused
  `_request`/`_next` parameter from a middleware signature — the parameter count is semantic.
  Module routers mount before the error middleware (Express dispatches an error only to layers
  registered after the failing one); the mount-order test pins it.
- Sanitizer and validator parameters are typed for the callers' benefit; at runtime they receive
  untrusted Express body data and must tolerate any shape.

**Validator** (`infrastructure/http/validator/<Action>Validator.ts`) — static class,
`validate(data): void`, private `validate<Field>` methods throwing
`InvalidArgument({customMessage})`. Delegate format checks to value-object construction
(`Email.fromPrimitives(email)` IS the email check).

**Router** — one `ModuleRouter` class per module implementing `HttpRouter`
(`getBasePath()` + `registerRoutes()`), registering a `baseHandler(appName, moduleName)` home route
plus its endpoints. Exemplar: `src/account/1.0/infrastructure/self/http/ModuleRouter.ts`. It is
discovered by filename convention — the file MUST be named `ModuleRouter.ts` and export
`ModuleRouter`.

## 9. Persistence adapters (multi-database)

> Only Mongo exists in code today (`RepositoryMongo`). The other base classes and
> drivers do NOT exist yet — do not import them until they land.

Persistence is a port in `domain/`; technology exists only under
`infrastructure/<technology>/`. Supported technologies: PostgreSQL, MySQL, MongoDB,
Neo4j. A project enables one or several — per module.

**The port never changes with the technology.** Parameters are value objects (`Uuid`,
`Email`), lookups return `Promise<Nullable<Entity>>`, writes return `Promise<void>`.
Entities cross the boundary only via `fromPrimitives`/`toPrimitives`. If a port needs a
technology-specific concept to compile, the port is wrong.

**One adapter per technology**, named `<Port><Technology>`: `AccountRepositoryPostgres`,
`AccountRepositoryMongo`, `AccountRepositoryNeo4j`. Each extends its technology base
class in `@core` (`RepositoryMongo`, `RepositoryPostgres`, `RepositoryMysql`,
`RepositoryNeo4j`), which owns connection lifecycle and config. Queries are always
parameterized (SQL placeholders, Mongo query objects, Cypher parameters) — never string
concatenation with user input.

**Driver selection is DI wiring**, per module, using the §5 registry pattern with a
string enum:

```ts
export enum PERSISTENCE_DRIVERS {
  MONGODB = 'mongodb',
  MYSQL = 'mysql',
  NEO4J = 'neo4j',
  POSTGRESQL = 'postgresql'
}
```

```ts
const accountRepositoryByDriver = {
  [PERSISTENCE_DRIVERS.MONGODB]: AccountRepositoryMongo,
  [PERSISTENCE_DRIVERS.POSTGRESQL]: AccountRepositoryPostgres
} satisfies Partial<Record<PERSISTENCE_DRIVERS, Newable<AccountRepository>>>;

export default new ContainerModule((options: ContainerModuleLoadOptions) => {
  options.bind<AccountRepositoryMongo>(AccountRepositoryMongo).toSelf().inSingletonScope();
  options.bind<AccountRepositoryPostgres>(AccountRepositoryPostgres).toSelf().inSingletonScope();

  options.bind<AccountRepository>(ACCOUNT_REPOSITORY)
    .toDynamicValue((context) => {
      const accountConfig = context.get<AccountConfig>(ACCOUNT_CONFIG);
      const persistenceDriver = accountConfig.persistenceDriver;
      const adapterClass = accountRepositoryByDriver[persistenceDriver];

      if (!adapterClass) {
        throw new ServerError('Unsupported persistence driver: ' + persistenceDriver);
      }

      return context.get(adapterClass);
    })
    .inSingletonScope();
});
```

Notes: a module supporting a SUBSET of drivers uses `satisfies Partial<Record<...>>` and
fails loudly on an unsupported driver (no silent fallbacks). A module supporting ALL
drivers drops `Partial` so a new enum member is a compile error until every registry is
updated. Adjust `context.get` to the Inversify API present in the repo.

**Several technologies at once:**

- Different modules on different databases: each module's `dependencyContainerModule.ts`
  binds its own driver. Nothing else to do.
- Two stores inside ONE module: model the second store as a second PORT with its own
  intent, not a second binding of the same port. If one port genuinely must write to two
  stores, wrap the adapters in a composite adapter implementing the port — and handle
  dual-write consistency explicitly (outbox pattern or documented eventual consistency).
  A silent partial write is a bug, never a fallback.

**Every adapter of a port passes the port's shared contract test suite** (see
`.claude/rules/testing.md`). The suite, not the technology, defines adapter correctness.

Exemplar until multi-database lands in code: `AccountRepositoryMongo` remains the
reference adapter shape.

## 10. TypeScript dialect

- `strict` mode; **explicit return type on every function**, **explicit accessibility on every
  member** (`public`/`private`/`protected`), `Array<T>` — never `T[]`.
- No `any` (rare exceptions carry a per-line `eslint-disable` comment). No `console.*` — inject the
  `Logger` port.
- Enums are string enums named SCREAMING_SNAKE plural: `IDENTITY_PROVIDERS`, `LOG_LEVELS`,
  `HTTP_SUCCESS_CODES`. Used directly as types (`provider: IDENTITY_PROVIDERS`).
- `Nullable<T>` for null contracts; do not mix `null` and `undefined` semantics.
- Reading a property from an `unknown` value: narrow with `typeof value === 'object' && value !== null`,
  then `Reflect.get(value, 'key')` (returns `unknown`) — never an `as`-cast.
- A plain object used as a lookup table with untrusted string keys is guarded with `Object.hasOwn`
  — `table['toString']` returns the inherited function, not `undefined`.
- Node builtin modules (`crypto`, `path`, `url`) are runtime, not framework — allowed in any
  layer, domain included.

## 11. Naming

**Always descriptive. No truncated words. No single letters.** This applies to variables,
functions, methods, parameters, and properties — including callbacks and loop variables. A name
must carry its full meaning without surrounding context — an agent (or newcomer) reading one line
in isolation should understand what the value is.

- Full words everywhere: `request`/`response`/`error` — never `req`/`res`/`err`/`e`;
  `databasePassword` — never `dbPass`; `moduleRouter` — never `mr`. Iterate with a named element
  (`for (const moduleRouter of routerList)`), not `i`/`x`/`item` when the element has a name.
- Well-known initialisms are allowed and cased as words: `Http`, `Url`, `Uuid`, `Api`, `Dto`
  (`HttpRouter`, `Uuid.fromPrimitives`) — everything else is written out.
- Methods are camelCase verb phrases that read as sentences: `checkIfEmailAlreadyExists`,
  `validateProviderIsPresent`, `getRecipientPhone`.
- Verb prefixes by contract: `get*` accessors; `ensure*` invariant guards (throw);
  `validate*` validators (throw); `check*` async existence checks (throw); `format*` pure
  formatters; `find*` nullable lookups vs `create`/`update`/`delete` writes in repositories;
  `from*`/`to*` conversions (`fromPrimitives`, `toMongo`).
- Booleans and predicates read as questions: `isModeCorrect`, `isDebugEnabled`, `isDisabled()`,
  `isEmptyString()`.
- When a value object and its raw form coexist in scope, suffix the primitive:
  `email: Email` vs `emailString: string`. Describe transformation state with participles:
  `sanitizedRequest`, `hashedPassword`, `normalized`.
- Classes are PascalCase nouns; handler files are camelCase verb phrases (`register.ts`,
  `sendMessage.ts`); constants and enum members are SCREAMING_SNAKE.
- Directories are singular (`entity/`, `valueObject/`, `useCase/`, `handler/`, `baseline/`,
  `report/`): a directory names the kind of thing inside, not the collection. Exempt: paths a
  host tool dictates (`.github/workflows`, `.claude/agents`, `node_modules`) and gitignored
  runtime output (`logs/`).

## 12. Formatting fingerprint (lint-enforced — trust `npm run lint-fix`)

- Single quotes, semicolons, **no trailing commas**, 2-space indent, LF, final newline.
- 1tbs braces, `curly` on all blocks, no single-line blocks, `eqeqeq` always.
- **Space before function parens**: `public run (input: X)`, `async (request, response) =>`.
- No space inside braces: `{value: x}`. No padded blocks. Max 1 consecutive blank line.
- **Blank line before every `return`.** No `else` after a returning `if`.
- Everything sorted naturally (perfectionist): imports, object keys, interface properties, union
  members, class members (properties by visibility → constructor → methods by visibility; note:
  domain classes place static factories and public methods before their **private** constructor,
  with private helpers last — copy the exemplars).
- JSON files (including `package.json`, `tsconfig.json`) are key-sorted (jsonc lint
  block; the VS Code extension applies it on save — `npm run lint` walks `./src` and
  does not cover root JSON, so fix-on-save or an explicit `npx eslint *.json` does).
- New Spanish or domain-specific words go into `cspell.json` (alphabetized).
- **Markdown files: never hard-wrap.** One paragraph (or list item, or table row) is ONE source
  line, however long — the editor soft-wraps. Line breaks only where markdown gives them meaning:
  between blocks, between list items, in tables and code fences. This applies to every `.md` an
  agent writes or edits (docs, drafts, memory); the owner should never have to unwrap lines by hand.

## 13. Known anti-patterns — present in the codebase, do NOT copy into new code

- The core `Config` god class (`src/core/1.0/Config.ts`) — it still holds every
  module's config and imports `Recipient` from `@communication`, violating the
  core-imports-nothing rule (a known depcruise violation until removal). Being
  REMOVED in favor of per-module config classes (§16). Do not add anything to it;
  new configuration goes directly into the owning module's config class. Delete
  `Config` when depcruise shows zero importers.
- Service-locator `dependencyContainer.get()` inside handlers — tolerated in existing handlers;
  prefer passing use cases into handler factories when touching this area.
- The `UseCase` base class (`src/core/1.0/application/UseCase.ts`) with `@inject` property
  injection — do not extend it.
- Validate-then-assert (`data.email!`) and `as`-casts in factory maps — use type narrowing on the
  discriminant instead.
- Glob + `new RouterClass(...)` in `HttpRouterExpress.getRouters` — a `ModuleRouter` constructor
  may only take `(Config, Logger)` until this is replaced with container multi-injection.

## 14. Workflow checklist for any change

**TDD, always.** Every behavior starts as a failing test, never as code:

1. Read the spec rule (§3 contract or §4 shall-rule) and write the test that pins it — for a
   port, the contract-suite case; for a value object, the property; for a use case, the
   in-memory-double scenario; for a message, the exact string. Run it: it must fail for the
   right reason (missing behavior, not a typo).
2. Write the smallest code that makes it pass.
3. Refactor with the test green; `npm run lint-fix` settles formatting/ordering.
4. Repeat per rule. A spec rule with no test is not implemented; a test with no spec rule is a
   proposal for the owner. Regenerating a module from its spec follows the same order — the
   suite is written from the spec first, the source second.

**When a spec change collides with a committed test**, do not patch the test and do not loop
against it: stop and emit a regression impact matrix, one row per pinned behavior the change
breaks, then wait for the owner's decision:

```markdown
## Regression impact: <spec file> §<section>

| test | old behavior (pinned) | new behavior (per spec) |
| --- | --- | --- |
| `test/.../X.test.ts:42` | 0% discount for new users | 5% welcome discount |
```

**Spec drafts** an agent writes for the owner live in `spec/draft/` as `<subject>.spec.md` (or
`<subject>.openapi.yaml` for a machine-readable contract); `spec/approved/` is protected, and the
owner moves an approved draft there.

**Contract parity.** A module's HTTP contract (spec §3 endpoint tables) is pinned by an HTTP-level
contract suite that drives the real Express stack (`HttpServerExpress` + the module's
`ModuleRouter`) with adapters replaced by doubles, one case per response-table row — status,
body shape and body text. Exemplar: `test/account/1.0/contract/registerEndpoint.test.ts`.

Then, before declaring the change done:

5. `npm run type-check` — must be clean.
6. `npm run lint-fix` — commit only a clean lint.
7. `npm run cspell` — add legitimate new words to `cspell.json`.
8. New env vars: add to `.env.example` (placeholder values only — never real credentials, emails,
   or phone numbers) and to the owning module's config class (§16).
9. New module: folder skeleton (§1) + tsconfig alias + `dependencyContainerModule.ts` +
   `ModuleRouter.ts`. Nothing else to wire.

## 15. Bounded contexts and sharing

Each module is a bounded context: one model, one language, accountable for its own data.
The same real-world thing may be a DIFFERENT model in different contexts (a document
being authored is not that document mid-execution); duplicating a shape across contexts
with different meaning is the boundary working, not a DRY violation.

- **Cross-context imports go only through `src/<context>/1.0/contract/`** — primitives-only
  DTOs and enums, no domain classes, no re-exports of entities. dependency-cruiser
  enforces both directions (`context-contract-only`, `contract-stays-primitive`).
  Breaking a contract = new version directory (`2.0/`), never an in-place break.
- **Consumer ports for behavior**: when context A needs context B to DO something, A
  defines a port in its own domain named for the need, and an in-process adapter calls
  B's use case. At extraction the adapter becomes an HTTP/queue client; A's domain and
  application change zero lines. External systems (e.g. third-party APIs) are external
  contexts: same pattern, and the adapter doubles as an Anti-Corruption Layer.
- **Data ownership**: a context's adapters never touch another context's
  tables/collections/graphs. Cross-context data access goes through the owner's
  contract or port. Prefix collections/tables with the owning context.
- **Template→instance seams snapshot at creation**: when the domain has authored
  templates that spawn running instances (a definition and its execution, a plan and
  its run), the instance copies what it needs at creation and freezes it; it never
  holds a live reference that lets editing the template mutate history. Not every
  project has such seams — the ones that exist are declared per project in
  `context-map.md` §3, never hardcoded as examples in this skill.
- **The sharing ladder** — where a concept lives, first rung that fits:
  1. Universal and semantics-free → `@core` (the cross-project standard library; test:
     would the line be byte-identical in an unrelated project?).
  2. One context defines its meaning → that context's `contract/`.
  3. It belongs to an interaction between contexts → a relationship context that owns
     the interaction as its own aggregate, referencing the others by id.
  4. Genuinely owner-less and worth sharing → a named kernel under
     `src/sharedKernel/<name>/`, declared in `context-map.md` with owner-of-record and
     consumer allowlist, plus its depcruise allowlist rule. Expected empty; if a
     concept is not worth a context-map entry, it is not worth sharing.
  There is no generic `@shared` folder and none may be created.
- `context-map.md` at the project root (owner-authored, protected, imported by `CLAUDE.md`)
  lists contexts, edges, snapshot seams, shared kernels, and the extraction
  triggers/procedure. Read it before touching any cross-context seam.

## 16. Per-module configuration

> Does not exist yet — build it as part of the per-module config task. Until then
> the frozen `Config` god class remains (§13).

Configuration is owned by the module that consumes it. There is no global config object.

**`EnvironmentReader`** is a port in `@core` (interface + Symbol token) with a
`EnvironmentReaderProcessEnv` adapter — the ONLY place in the codebase that touches
`process.env`. It exposes typed, throwing readers: `getRequiredString(name)`,
`getRequiredNumber(name)`, `getRequiredEnum(name, enumObject)`,
`getOptionalString(name)`. Missing or malformed variables throw `ServerError` naming the
variable.

**`<Module>Config`** is a plain injectable class in the module's `infrastructure/`,
bound `.inSingletonScope()` in the module's own `dependencyContainerModule.ts`:

```ts
export class AccountConfig {
  public readonly jwtSecret: string;
  public readonly persistenceDriver: PERSISTENCE_DRIVERS;

  public constructor (@inject(ENVIRONMENT_READER) environmentReader: EnvironmentReader) {
    this.jwtSecret = environmentReader.getRequiredString('ACCOUNT_JWT_SECRET');
    this.persistenceDriver = environmentReader.getRequiredEnum('ACCOUNT_PERSISTENCE_DRIVER', PERSISTENCE_DRIVERS);
  }
}

export const ACCOUNT_CONFIG = Symbol.for('AccountConfig');
```

Rules:

- **Eager validation**: all fields are resolved and validated in the constructor, so a
  misconfigured process fails at boot with the offending variable named — never at first
  use.
- **Namespaced variables**: every variable is prefixed with its module,
  `<MODULE>_<NAME>` (`ACCOUNT_JWT_SECRET`, `COMMUNICATION_WABA_TOKEN`). A module never
  reads another module's variables. `.env.example` is grouped by module prefix.
- **`@core` keeps only its own**: a small `CoreConfig` (HTTP port, log level) plus
  per-technology connection settings consumed by the `Repository<Technology>` base
  classes. Nothing feature-flavored.
- `process.env` outside `EnvironmentReaderProcessEnv` is forbidden. Optionally
  lint-enforce with `eslint-plugin-n`'s `n/no-process-env` and a single-file override
  for the adapter.
- Extraction consequence: a context leaving the repo takes its config class and its
  variable prefix with it, untouched.
