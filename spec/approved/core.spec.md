# Core Specification

Authored and edited by Daniel only. Agents: read-only. Implementation conforms to this document; when they disagree, this document wins.

## 1. Purpose

`@core` is the cross-project standard library of the API: everything a feature module needs that carries no business meaning. It provides the domain building blocks (value objects, the entity ladder, domain errors, discriminated-union typing), the ports every module talks through (logging, configuration, HTTP serving and routing, database connections), the adapters behind those ports, and the error middleware that turns domain errors into HTTP answers.

## 2. Scope

Defines: the public surface of `@core` (every exported type, class, function and token, with its behavior and messages), the HTTP status mapping of domain errors, the configuration variables `@core` reads, the DI bindings the module registers, and the composition root that boots the process.

Does not define: any feature module, the persistence adapters of feature modules (they extend the base classes specified here), the deployment environment, or the content of seed files.

## 3. Contract

### 3.1 Module shape

`src/core/1.0/` with the layers `application/`, `domain/` (`entity/`, `error/`, `type/`, `valueObject/`, one file per port), `infrastructure/` (`http/`, `mongodb/`, one file per adapter), and a `dependencyContainerModule.ts`. Alias `@core/*` → `core/1.0/*`. `@core` never imports from a feature module.

### 3.2 Types (`domain/type/`)

- `Nullable<T>` = `null | T`.
- `StrictUnion<UNION>`: every member of the union gains every key of every other member as an optional `never`; discriminant narrowing is preserved.
- `DateRange` = `{fromDate: Date; toDate: Date}`.
- `Pagination` = `{limit: number; page: number}`; `PaginationResponse<T>` = `{currentPage, data: Array<T>, hasNextPage, hasPreviousPage, totalItems, totalPages}`.
- `LOG_LEVELS` string enum: `DEBUG = 'debug'`, `ERROR = 'error'`, `INFO = 'info'`, `WARNING = 'warning'`.
- HTTP status enums, members in ascending numeric order, plus `HTTP_CODES` = the union of all five:
  - `HTTP_INFORMATIONAL_CODES`: CONTINUE 100, SWITCHING_PROTOCOLS 101, PROCESSING 102, EARLY_HINTS 103.
  - `HTTP_SUCCESS_CODES`: OK 200, CREATED 201, ACCEPTED 202, NON_AUTHORITATIVE_INFORMATION 203, NO_CONTENT 204, RESET_CONTENT 205, PARTIAL_CONTENT 206, MULTI_STATUS 207, ALREADY_REPORTED 208, IM_USED 226.
  - `HTTP_REDIRECTION_CODES`: MULTIPLE_CHOICES 300, MOVED_PERMANENTLY 301, FOUND 302, SEE_OTHER 303, NOT_MODIFIED 304, USE_PROXY 305, TEMPORARY_REDIRECT 307, PERMANENT_REDIRECT 308.
  - `HTTP_CLIENT_ERROR_CODES`: BAD_REQUEST 400, UNAUTHORIZED 401, PAYMENT_REQUIRED 402, FORBIDDEN 403, NOT_FOUND 404, METHOD_NOT_ALLOWED 405, NOT_ACCEPTABLE 406, PROXY_AUTHENTICATION_REQUIRED 407, REQUEST_TIMEOUT 408, CONFLICT 409, GONE 410, LENGTH_REQUIRED 411, PRECONDITION_FAILED 412, PAYLOAD_TOO_LARGE 413, URI_TOO_LONG 414, UNSUPPORTED_MEDIA_TYPE 415, RANGE_NOT_SATISFIABLE 416, EXPECTATION_FAILED 417, IM_A_TEAPOT 418, MISDIRECTED_REQUEST 421, UNPROCESSABLE_ENTITY 422, LOCKED 423, FAILED_DEPENDENCY 424, TOO_EARLY 425, UPGRADE_REQUIRED 426, PRECONDITION_REQUIRED 428, TOO_MANY_REQUESTS 429, REQUEST_HEADER_FIELDS_TOO_LARGE 431, UNAVAILABLE_FOR_LEGAL_REASONS 451.
  - `HTTP_SERVER_ERROR_CODES`: INTERNAL_SERVER_ERROR 500, NOT_IMPLEMENTED 501, BAD_GATEWAY 502, SERVICE_UNAVAILABLE 503, GATEWAY_TIMEOUT 504, HTTP_VERSION_NOT_SUPPORTED 505, VARIANT_ALSO_NEGOTIATES 506, INSUFFICIENT_STORAGE 507, LOOP_DETECTED 508, NOT_EXTENDED 510, NETWORK_AUTHENTICATION_REQUIRED 511.

### 3.3 Value objects (`domain/valueObject/`)

- `Primitives` = `boolean | Date | number | string`. `ValueObject<T extends Primitives>` (abstract): `protected readonly value: T`; `toPrimitives(): T`; `protected equals(other): boolean` (strict equality); the protected constructor throws `InvalidArgument({value, valueObjectName: <runtime class name>})` when the value is `null` or `undefined`.
- `TrimmedString extends ValueObject<string>`: `fromPrimitives(string)`; the protected constructor trims the input; `isEmptyString(): boolean`.
- `Email extends TrimmedString`: valid iff `/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/`.
- `Phone extends TrimmedString`: valid iff `/^\+\d{7,15}$/`.
- `Url extends TrimmedString`: valid iff `new URL(value)` does not throw.
- `Time extends TrimmedString`: valid iff `/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9](\.\d{3})?)?$/`.
- `LanguageTag extends TrimmedString`: valid iff `new Intl.Locale(value)` does not throw.
- `Uuid extends TrimmedString`: `create()` generates a v4; valid iff the `uuid` package validates it.
- `Names`: `NamesPrimitives` = `{family: string; given: string}`; `fromPrimitives`/`toPrimitives`; holds `given` and `family` as `TrimmedString`; an empty given or family name throws `InvalidArgument({customMessage: '<Names> does not allow empty strings'})`.

Every value object above rejects an invalid value with `InvalidArgument({value, valueObjectName: <class name>})` unless stated otherwise.

### 3.4 Entities (`domain/entity/`)

Each rung has a `<Rung>Primitives` interface, a `protected static buildNew()` and a `toPrimitives()` that compose the chain, and a protected constructor that hydrates from primitives.

- `BaseEntity`: `{id: string}`; `public readonly id: Uuid`; `buildNew()` generates a v4 id.
- `TimestampedEntity extends BaseEntity`: adds `createdAt: Date`, `updatedAt: Date` (readonly); `buildNew()` sets both to the same instant.
- `AuditedEntity extends TimestampedEntity`: adds `deletedAt: Nullable<Date>`; `buildNew()` sets it to `null`; `delete()` throws `Conflict('Entity is already deleted')` when already deleted, else sets `deletedAt` to now; `restore()` sets `deletedAt = null`; `isDeleted()`.

### 3.5 Errors (`domain/error/`)

Every error extends `Error`; the 5xx family extends `ServerError`.

| class | constructor | message |
| --- | --- | --- |
| `InvalidArgument` | `({customMessage?, value?, valueObjectName?})` | `customMessage` when given, else `<${valueObjectName}> does not allow the value <${value}>` |
| `Unauthorized` | `(reason: string)` | `Unauthorized. Reason: ${reason}.` |
| `Forbidden` | `()` | `You don't have permissions to access this resource.` |
| `NotFound` | `(resource: string)` | `${resource} not found.` |
| `Conflict` | `(resource: string)` | `Conflict: ${resource}.` |
| `ServerError` | `(message?: string)` | `Server error. ${message ?? ''}` |
| `DatabaseError` | `()` | `Database error.` |
| `NotImplemented extends ServerError` | `(message = 'Not implemented.')` | `message` verbatim |
| every other 4xx class | `(message = <default>)` | `message` verbatim |
| every other 5xx class `extends ServerError` | `(message = <default>)` | `message` verbatim |

Other 4xx classes and default messages: `PaymentRequired` "Payment required.", `MethodNotAllowed` "Method not allowed.", `NotAcceptable` "Not acceptable.", `ProxyAuthenticationRequired` "Proxy authentication required.", `RequestTimeout` "Request timeout.", `Gone` "Gone.", `LengthRequired` "Length required.", `PreconditionFailed` "Precondition failed.", `PayloadTooLarge` "Payload too large.", `UriTooLong` "URI too long.", `UnsupportedMediaType` "Unsupported media type.", `RangeNotSatisfiable` "Range not satisfiable.", `ExpectationFailed` "Expectation failed.", `ImATeapot` "I'm a teapot.", `MisdirectedRequest` "Misdirected request.", `UnprocessableEntity` "Unprocessable entity.", `Locked` "Locked.", `FailedDependency` "Failed dependency.", `TooEarly` "Too early.", `UpgradeRequired` "Upgrade required.", `PreconditionRequired` "Precondition required.", `TooManyRequests` "Too many requests.", `RequestHeaderFieldsTooLarge` "Request header fields too large.", `UnavailableForLegalReasons` "Unavailable for legal reasons.".

Other 5xx classes and default messages: `BadGateway` "Bad gateway.", `ServiceUnavailable` "Service unavailable.", `GatewayTimeout` "Gateway timeout.", `HttpVersionNotSupported` "HTTP version not supported.", `VariantAlsoNegotiates` "Variant also negotiates.", `InsufficientStorage` "Insufficient storage.", `LoopDetected` "Loop detected.", `NotExtended` "Not extended.", `NetworkAuthenticationRequired` "Network authentication required.".

### 3.6 Ports (`domain/`)

Each port is an interface plus a `Symbol.for` token in the same file.

- `Logger` / `LOGGER`: `debug(message, meta?)`, `info(message, meta?)`, `warning(message, meta?)`, `error(error: Error)`.
- `EnvironmentReader` / `ENVIRONMENT_READER`: `getRequiredString(name)`, `getRequiredNumber(name)`, `getRequiredEnum(name, enumObject)`, `getOptionalString(name): Nullable<string>`, `getOptionalNumber(name, defaultValue)`, `getOptionalBoolean(name, defaultValue)`.
- `CoreConfig` / `CORE_CONFIG`: `getApiName(): string`, `getApiPort(): number`, `getNodeEnvironment(): string`, `isDebugEnabled(): boolean`, `getLogLevel(): LOG_LEVELS`.
- `MongoConfig` / `MONGO_CONFIG`: `getHost(): string`, `getPort(): number`, `getUser(): Nullable<string>`, `getPassword(): Nullable<string>`, `getDatabaseName(): string`.
- `PostgreSqlConfig` / `POSTGRESQL_CONFIG`: `getHost(): string`, `getPort(): number`, `getUser(): string`, `getPassword(): string`, `getDatabaseName(): string`.
- `HttpServer` / `HTTP_SERVER`: `start(): Promise<void>`, `stop(): Promise<void>`.
- `HttpRouter` / `HTTP_ROUTER`: `getBasePath(): string`, `registerRoutes(): Promise<express.Router>`.
- `DatabaseConnection` / `DATABASE_CONNECTION`: `getDatabase(): Promise<unknown>`, `disconnect(): Promise<void>`.
- `STARTUP_CONFIG_VALIDATION`: a token without interface; every config binding is also bound to it as a service.

### 3.7 Application helpers (`application/`)

- `sleep(ms: number): Promise<void>`.
- `formatDateTime(date: Date): string` — `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`, local time, month 1-based, no zero padding.
- `formatFullname(names: Names, familyFirst = false): string` — `${given} ${family}`, or `${FAMILY}, ${given}` when `familyFirst`.
- `formatInitials(names: Names, separator = ''): string` — the upper-cased first character of each space-separated part of the given name, then of the family name, each followed by `separator`; trimmed.
- `formatEmail(email: string): string` — lower-cased.
- `formatE164(phone: string): string` — removes `/[\s().-]/g`; a `00` prefix becomes `+`; a `+` prefix is kept; anything else is prefixed with `+`.

### 3.8 Configuration (`infrastructure/`)

One adapter per config port in §3.6 — `CoreConfigEnvironment`, `MongoConfigEnvironment`, `PostgreSqlConfigEnvironment` — each constructed with the `EnvironmentReader` and resolving every variable in its constructor.

| adapter | getter | variable | reader |
| --- | --- | --- | --- |
| `CoreConfigEnvironment` | `getApiName()` | `API_NAME` | `getRequiredString` |
| | `getApiPort()` | `API_PORT` | `getRequiredNumber` |
| | `getNodeEnvironment()` | `NODE_ENV` | `getRequiredString` |
| | `isDebugEnabled()` | `DEBUG` | `getOptionalBoolean`, default `false` |
| | `getLogLevel()` | `LOG_LEVEL` | `getRequiredEnum(LOG_LEVELS)` |
| `MongoConfigEnvironment` | `getHost()` | `MONGODB_HOST` | `getRequiredString` |
| | `getPort()` | `MONGODB_PORT` | `getRequiredNumber` |
| | `getUser()` | `MONGODB_USER` | `getOptionalString` |
| | `getPassword()` | `MONGODB_PASSWORD` | `getOptionalString` |
| | `getDatabaseName()` | `MONGODB_DATABASE` | `getRequiredString` |
| `PostgreSqlConfigEnvironment` | `getHost()` | `POSTGRESQL_HOST` | `getRequiredString` |
| | `getPort()` | `POSTGRESQL_PORT` | `getRequiredNumber` |
| | `getUser()` | `POSTGRESQL_USER` | `getRequiredString` |
| | `getPassword()` | `POSTGRESQL_PASSWORD` | `getRequiredString` |
| | `getDatabaseName()` | `POSTGRESQL_DATABASE` | `getRequiredString` |

### 3.9 Infrastructure adapters (`infrastructure/`)

#### 3.9.1 `EnvironmentReaderProcessEnv`

A variable that is unset or empty is missing. `getRequiredString` → `ServerError('Missing environment variable ${name}.')` when missing. Numbers must match `/^-?\d+$/`, else `ServerError('Environment variable ${name} must be an integer.')`. `getRequiredEnum` matches the raw value against `Object.values(enumObject)`, else `ServerError('Environment variable ${name} must be one of: ${values joined by ", "}.')`. `getOptionalBoolean` accepts exactly `"true"` or `"false"`, else `ServerError('Environment variable ${name} must be "true" or "false".')`. The optional readers return the default (or `null`) only when the variable is missing.

#### 3.9.2 `LoggerWinston`

Constructor `(CoreConfig)`. Level = the configured log level; `defaultMeta = {app_name, app_port, debug_enabled, log_level}`; transports: console, plus two daily-rotate files in `./logs/` (`datePattern 'YYYY-MM-DD-HH'`, `maxFiles '14d'`, `maxSize '20m'`, zipped) named `%DATE%-${nodeEnvironment}-info.log` (level info) and `%DATE%-${nodeEnvironment}-error.log` (level error). Timestamp format `'YYYY-MM-DD HH:mm:ss:SSS Z'`; level colors debug `brightCyan`, error `red`, info `brightBlue`, warn `yellow`. Debug mode: timestamp + `prettyPrint({colorize: false, depth: 5})` + `colorize({all: true})`; otherwise timestamp + `colorize({level: true})` + `${timestamp} ${app_name}:${app_port} ${level}: ${message}`. `error(error)` logs `{message, name, stack}`.

#### 3.9.3 `MongoConnection`

Constructor `(MongoConfig, Logger)`. `getDatabase(): Promise<mongodb.Db>` connects on first call (warning `Connection not yet established. Trying again...`, info `Connecting to mongodb...`) to `mongodb://${credentials}:${port}/?authSource=${databaseName}`, where `credentials` is `${user}:${password}@${host}` when both are present, else `${host}`; returns `client.db(databaseName)`. `disconnect()` logs `Disconnecting from mongodb...` and closes the client.

#### 3.9.4 `DatabaseConnectionPostgreSQL implements DatabaseConnection`

Constructor `(PostgreSqlConfig, Logger)`. `getDatabase(): Promise<pg.Pool>` creates the pool on first call (warning `Connection not yet established. Trying again...`, info `Connecting to PostgreSQL (Supabase)...`) with `ssl: {rejectUnauthorized: false}`, probes it with `SELECT 1`, logs `PostgreSQL connection established successfully.`. `disconnect()` logs `Disconnecting from PostgreSQL...` and ends the pool.

#### 3.9.5 `RepositoryMongo`

Base class for Mongo adapters, constructed with `MongoConnection`. `WithMongoId<T>` = `Omit<T, 'id'> & {_id: UUID}`. `getCollection<T>(name)`; `toMongo(entity)` replaces `id` with `_id = getObjectId(Uuid)`; `fromMongo(document)` replaces `_id` with its canonical dashed lower-case text as `id`; `getObjectId(uuid)` = `new mongodb.UUID(<uuid text>)`.

#### 3.9.6 `HttpServerExpress`

Constructor `(CoreConfig, Logger, HttpRouter)` installs, in order: `bodyParser.json({limit: '2mb'})`, `bodyParser.urlencoded({extended: true, limit: '2mb'})`, `helmet()`, `helmet.xssFilter()`, `helmet.noSniff()`, `helmet.hidePoweredBy()`, `helmet.frameguard({action: 'deny'})`, `compression()`, `cors()`. `start()` mounts `await router.registerRoutes()`, then listens on the API port and resolves once listening, logging `${apiName} running on port ${apiPort} (${nodeEnvironment}, debug ${isDebugEnabled}, log level ${logLevel}).`. `stop()` closes the server.

#### 3.9.7 `HttpRouterExpress`

Constructor `(CoreConfig, Logger)`; `getBasePath()` = `'/'`. `registerRoutes()` globs `**/ModuleRouter<current file extension>` from the working directory, imports each file (info `Loading router from file: ${fileUrl}`), takes its `ModuleRouter` export — when it is not a function, logs `NotFound('ModuleRouter class in ${fileUrl}')` and skips it — instantiates it as `new ModuleRouter(coreConfig, logger)`, and mounts the routers sequentially in discovery order at `getBasePath() + moduleRouter.getBasePath()`; then mounts `errorHandler(logger)`, logs `Router Stack` with the stack as meta, and returns the router.

#### 3.9.8 HTTP handlers (`infrastructure/http/handler/`)

- `baseHandler(appName, moduleName): Handler` — `HTTP_SUCCESS_CODES.OK` with the JSON string `${appName} - ${moduleName} home page`; failures go to `next(error)`.
- `errorHandler(logger): ErrorRequestHandler` — arity four; logs every error with `logger.error(error)` and answers per §5.

#### 3.9.9 Seeding (`infrastructure/mongodb/migration/`)

- `DataSeeder` (`CoreConfig`, `Logger`, `MongoConnection`): `populate()` returns immediately when the node environment is `'production'`. Otherwise, for each `**/mongodb/seed/*.json` (collection name = file name without `.json`/`.csv`, content = JSON array): an item's `id` becomes `_id` per §4.5, every item goes through `SeedDocumentFormatter.format`, the collection is dropped and the documents inserted, with info logs `Found seed file: ${filename}`, `${filename} contains ${count} documents.`, `Dropping ${collection} collection...`, `Inserting ${count} documents into ${collection} collection...`, `Collection ${collection} seeded successfully.`. Finally the connection is closed.
- `SeedDocumentFormatter.format(document)` decodes recursively and in place: `null`/`undefined` → `null`; `{$date: <string|number>}` → `Date`; for the fields `created_at`/`updated_at`, `{$numberLong: "<milliseconds>"}` → `Date`; other objects recurse; primitives pass through. An undecodable date throws `InvalidArgument({value, valueObjectName: 'SeedDate'})`.

### 3.10 Ports and adapters (`dependencyContainerModule.ts`)

| port | adapter | scope |
| --- | --- | --- |
| `ENVIRONMENT_READER` | `EnvironmentReaderProcessEnv` | singleton |
| `CORE_CONFIG` (also `STARTUP_CONFIG_VALIDATION`) | `CoreConfigEnvironment` | singleton |
| `MONGO_CONFIG` (also `STARTUP_CONFIG_VALIDATION`) | `MongoConfigEnvironment` | singleton |
| `LOGGER` | `LoggerWinston` | singleton |
| `HTTP_SERVER` | `HttpServerExpress` | transient |
| `HTTP_ROUTER` | `HttpRouterExpress` | transient |
| `POSTGRESQL_CONFIG` (also `STARTUP_CONFIG_VALIDATION`) | `PostgreSqlConfigEnvironment` | singleton, bound only while a module consumes the connection |
| `DATABASE_CONNECTION` | `DatabaseConnectionPostgreSQL` | singleton, bound only while a module consumes it |

Classes bound to themselves: `MongoConnection` (singleton), `RepositoryMongo`, `DataSeeder`.

### 3.11 Composition root (`src/`)

- `dependencyContainer.ts` discovers every `<module>/<version>/dependencyContainerModule.{js,ts}` next to itself (`src/` under tsx and Vitest, `dist/` after the build) and loads each default export into one `Container`, in path order.
- `App` (`@inject(HTTP_SERVER)`): `start()` starts the server.
- `index.ts` loads `dotenv`, resolves the `Logger`, resolves every `STARTUP_CONFIG_VALIDATION` binding, then starts `App`; any error is logged and the process exits with code 1.
- `cli.ts` loads `dotenv` and exposes the `commander` program `seeder` with the command `populate` → `DataSeeder.populate()`.

## 4. Behavior

### 4.1 Ports and adapters

- A port owns its vocabulary (level names, status names, option names); an adapter shall translate it into its library's own.
- Configuration values shall be expressed in port vocabulary.

### 4.2 Domain building blocks

- A value object shall validate itself in its constructor and shall throw `InvalidArgument` naming the value object and the rejected value.
- A string value object shall trim its input before validating and storing it.
- A value object shall expose its primitive only through `toPrimitives()`.
- An absent persisted value shall be `Nullable`, never `undefined`.
- Every entity shall have a `Uuid` id generated by `buildNew()`; a `TimestampedEntity` shall be created with equal `createdAt` and `updatedAt`.
- An `AuditedEntity` shall refuse a second `delete()` with `Conflict`; `restore()` shall be idempotent; `deletedAt` shall change only through those methods.
- A `StrictUnion` variant shall reject every other variant's fields at compile time while every union key stays readable on the union type.

### 4.3 Errors

- Domain and application code shall throw `@core` errors only and shall never reference HTTP status codes.
- Each error's message shall be exactly as listed in §3.5.

### 4.4 Configuration

- `process.env` shall be read only by `EnvironmentReaderProcessEnv`; every config class shall read through the `EnvironmentReader` port.
- A config class shall resolve and validate all of its variables in its constructor.
- A missing or empty variable shall be absent; a required absent variable shall fail with `ServerError` naming the variable.
- A malformed variable shall fail with `ServerError` naming the variable and the expected shape; a default value shall never apply to a malformed value.
- Every config class shall be bound to `STARTUP_CONFIG_VALIDATION`, which the composition root shall resolve before the HTTP server starts.
- `@core` shall read only the variables in §3.8; every other variable belongs to the module that consumes it, under that module's prefix.

### 4.5 HTTP

- Status codes shall come from the `HTTP_*_CODES` enums, never numeric literals.
- An empty-body answer shall be written with `status(...).end()`, never `sendStatus()`.
- The server shall mount its routes before it listens; `start()` shall resolve once the server is listening.
- Module routers shall be mounted before the error middleware; the error middleware shall keep its arity of four.
- The error middleware shall log every error before answering, shall answer every error itself and shall never call `next`.
- Client errors shall answer with their message as a JSON string body; mapped server errors shall answer with an empty body; anything unmapped shall answer `500` with the JSON string `"Unknown error"`.

### 4.6 Persistence

- A Mongo adapter shall extend `RepositoryMongo` and cross the boundary only through `toMongo`/`fromMongo`.
- Every Mongo `_id` written by `@core`, by adapters and by the seeder, shall be the BSON UUID (Binary subtype 4, 16 bytes) of the entity's `Uuid`.
- A connection shall be established on first use; `disconnect()` shall be a no-op when nothing is connected.
- Seeding shall never run in production.

### 4.7 Logging

- All logging shall go through the `Logger` port; `console.*` is allowed only in the composition root's discovery diagnostics.
- `Logger.error` shall receive an `Error`; the adapter shall record its name, message and stack.

## 5. Errors

The HTTP mapping applied by `errorHandler`, matched by `instanceof` in table order, client list before server list:

| domain error | HTTP | body |
| --- | --- | --- |
| `InvalidArgument` | `400` | message |
| `Unauthorized` | `401` | message |
| `PaymentRequired` | `402` | message |
| `Forbidden` | `403` | message |
| `NotFound` | `404` | message |
| `MethodNotAllowed` | `405` | message |
| `NotAcceptable` | `406` | message |
| `ProxyAuthenticationRequired` | `407` | message |
| `RequestTimeout` | `408` | message |
| `Conflict` (and subclasses) | `409` | message |
| `Gone` | `410` | message |
| `LengthRequired` | `411` | message |
| `PreconditionFailed` | `412` | message |
| `PayloadTooLarge` | `413` | message |
| `UriTooLong` | `414` | message |
| `UnsupportedMediaType` | `415` | message |
| `RangeNotSatisfiable` | `416` | message |
| `ExpectationFailed` | `417` | message |
| `ImATeapot` | `418` | message |
| `MisdirectedRequest` | `421` | message |
| `UnprocessableEntity` | `422` | message |
| `Locked` | `423` | message |
| `FailedDependency` | `424` | message |
| `TooEarly` | `425` | message |
| `UpgradeRequired` | `426` | message |
| `PreconditionRequired` | `428` | message |
| `TooManyRequests` | `429` | message |
| `RequestHeaderFieldsTooLarge` | `431` | message |
| `UnavailableForLegalReasons` | `451` | message |
| `NotImplemented` | `501` | empty |
| `BadGateway` | `502` | empty |
| `ServiceUnavailable` | `503` | empty |
| `GatewayTimeout` | `504` | empty |
| `HttpVersionNotSupported` | `505` | empty |
| `VariantAlsoNegotiates` | `506` | empty |
| `InsufficientStorage` | `507` | empty |
| `LoopDetected` | `508` | empty |
| `NotExtended` | `510` | empty |
| `NetworkAuthenticationRequired` | `511` | empty |
| `ServerError`, `DatabaseError`, any other `Error` | `500` | `"Unknown error"` |

"message" is `error.message` serialized as a JSON string.

## 6. Non-goals

`@core` does not provide: authentication or session handling, request validation beyond value objects, an ORM or query builder, PostgreSQL/MySQL/Neo4j repository base classes, a scheduler, an event bus, an HTTP client, a mailer, a use-case base class, a global configuration object, or any business concept.

## 7. Conformance

An implementation conforms if it satisfies sections 3–5 and passes the gauntlet. The tests that embody this document live under `test/core/1.0/**` plus each module's startup-validation wiring test; a rule added to §4 is expected to arrive with its test. `src/App.ts`, `src/cli.ts`, `src/dependencyContainer.ts` and `src/index.ts` are coverage-excluded composition roots.