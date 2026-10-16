# Account Specification

Authored and edited by Daniel only. Agents: read-only. Implementation conforms to this document; when they disagree, this document wins.

## 1. Purpose

The account module owns who a user is. An **Account** is the user: enabled or disabled, with a primary email and/or a primary phone. An **Identity** is one way that account proves itself — email and password, a phone number, or an external provider (Apple, Google, Meta). Each identity can be verified or unverified. An account holds at least one identity.

This version of the specification covers the module shape, the domain model, and registration.

## 2. Scope

Defines: the account module structure (split between self and user submodules inside each hexagonal layer when needed), the domain shapes (entities, identity variants, value objects), the module configuration, the register endpoint contract, the payload each provider sends, the account and identity created per provider, how identities become verified, the persistence uniqueness guarantees, and the error responses.

Does not define: how each handler works internally, how database connections are managed, login, multi-factor authentication, validating the email or phone (the verify flow has its own spec), linking a second identity to an existing account, password reset, one-time login links, changing a primary email or phone, or administration of accounts (see §6).

## 3. Contract

### 3.1 Module shape

The infrastructure separates each submodule's handlers. Layers follow the hexagonal architecture and the code-style skill.

### 3.2 Domain shapes

- The domain has the `Account` and `Identity` entities.
- `Account` extends `TimestampedEntity` and carries: `disabledAt` (nullable date), `identities` (list of identities), `primaryEmail` (nullable email), `primaryPhone` (nullable phone).
- Every identity variant extends `TimestampedEntity` through a shared base carrying: `provider` (one of `apple` | `google` | `meta` | `password` | `phone`), `verifiedAt` (nullable date), `disabledAt` (nullable date).
- Per-provider identity data, on top of the base:

| provider | identity data |
| --- | --- |
| `password` | `password` (bcrypt hash), `hash` (the single-use token for the verification link) |
| `phone` | `code` (verification code) |
| `apple` / `google` / `meta` | `email` (the provider's asserted email), `providerUserId`, other fields depending the oauth provider |

- The `password` and `phone` identities carry NO contact of their own: the account's `primaryEmail`/`primaryPhone` IS the login identifier, so a credential can never bind a stale contact (a recycled email or number must never keep logging in). OAuth identities keep their `email` because there it is the provider's asserted record, which may legitimately differ from the primary.
- A verification code is a string of decimal digits only, produced with a cryptographically secure random source, with configurable length (§3.4).
- Password composition rules are a value object holding minimum counts of digits, lowercase letters, uppercase letters, and symbols; each count is a non-negative integer.
- Hydration from primitives shall restore the concrete identity variant for its `provider` discriminant. Creation sites that know the concrete variant statically shall call that variant's own `create` — never a generic factory.

### 3.3 Register endpoint

`POST /auth/register` — JSON body, `Content-Type: application/json`.

```jsonc
{
  "provider": "apple" | "google" | "meta" | "password" | "phone",
  "providerData": { /* shape depends on provider, see below */ }
}
```

| provider | providerData | source of the shape |
| --- | --- | --- |
| `password` | `{"email": string, "password": string}` | the user's credentials |
| `phone` | `{"phone": string}` | `phone` in international form |
| `apple` | `{"code": string, "id_token": string, "state": string, "user"?: {"email": string, "name": {"firstName": string, "lastName": string}}}` | Sign in with Apple authorization response, verbatim |
| `google` | `{"access_token": string, "expires_in": number, "id_token": string, "refresh_token"?: string, "scope": string, "token_type": string}` | Google OAuth token response, verbatim |
| `meta` | `{"authResponse": {"accessToken": string, "expiresIn": number \| string, "userID": string}, "status": string}` | Facebook SDK login response, verbatim |

Responses:

| status | body | when |
| --- | --- | --- |
| `202 Accepted` | empty | the account was created |
| `202 Accepted` | empty (the domain threw `"Conflict: email."` / `"Conflict: phone."` and the HTTP layer silenced it) | the primary contact already belongs to an account AND the provider creates its identity unverified (`password`, `phone`) |
| `400 Bad Request` | JSON string with the reason | the body is malformed or fails a rule in §4 |
| `409 Conflict` | `"Conflict: email."` / `"Conflict: phone."` | the primary contact already belongs to an account AND the provider creates its identity already verified (oauth) |
| `501 Not Implemented` | empty | the functionality is not implemented |
| `500 Internal Server Error` | `"Unknown error"` | anything the module did not anticipate |

Unknown body fields, at any depth, are ignored. Field names inside `providerData` are the provider's own (snake_case for Google, camelCase for Meta) and are not translated.

Machine-readable form: `spec/approved/account.openapi.yaml` (OpenAPI 3.1). The tables above are the contract; the OpenAPI document mirrors them and, when they disagree, the prose wins.

### 3.4 Configuration

All variables are optional with the documented default; a value outside its range shall abort startup with a `ServerError` naming the variable.

| variable | default | range | meaning |
| --- | --- | --- | --- |
| `ACCOUNT_PASSWORD_MINIMUM_DIGITS` | `0` | `>= 0` | minimum digits in a password |
| `ACCOUNT_PASSWORD_MINIMUM_LOWERCASE` | `0` | `>= 0` | minimum lowercase letters in a password |
| `ACCOUNT_PASSWORD_MINIMUM_UPPERCASE` | `0` | `>= 0` | minimum uppercase letters in a password |
| `ACCOUNT_PASSWORD_MINIMUM_SYMBOLS` | `0` | `>= 0` | minimum symbols in a password |
| `ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH` | `6` | `>= 1` | digits in a phone verification code |

### 3.5 Ports and adapters

| port | operations | adapter | scope |
| --- | --- | --- | --- |
| `AccountRepository` / `ACCOUNT_REPOSITORY` | `create(account)`, `update(account)`, `delete(id: Uuid)`, `findById(id: Uuid)`, `findByEmail(email: Email)`, `findByPhone(phone: Phone)`; lookups return `Nullable<Account>`, writes return `void` | `AccountRepositoryMongo` | singleton |
| `Encrypter` / `ENCRYPTER` | `encrypt(plainText): Promise<string>`, `compare(plainText, hashedText): Promise<boolean>` | `EncrypterBcrypt` | singleton |
| `AccountConfig` / `ACCOUNT_CONFIG` (also `STARTUP_CONFIG_VALIDATION`) | `getPasswordCompositionRules()`, `getVerificationCodeLength()` | `AccountConfigEnvironment` | singleton |
| `RegistrationStrategyRegistry` / `REGISTRATION_STRATEGY_REGISTRY` | `Record<IDENTITY_PROVIDERS, RegistrationStrategy>`; a strategy is `register(rawProviderData: unknown): Promise<Account>` | `AppleRegistration`, `GoogleRegistration`, `MetaRegistration`, `PasswordRegistration`, `PhoneRegistration`, assembled in the wiring | singleton |
| `VerificationMessageSender` | sends the verification and duplicate-attempt messages of §4.3 and §4.4 | the communication context's in-process adapter (context map §2) | singleton |

`Register` (bound to itself) is the use case behind the endpoint: `run(input: unknown)` parses the envelope, selects the strategy for `provider`, and persists the account the strategy returns.

## 4. Behavior

### 4.1 Entities

- The Account entity shall extend from TimestampedEntity.
- The Identity entity shall extend from TimestampedEntity.
- An identity shall refuse to be verified twice and refuse to be enabled or disabled twice (`Conflict`).
- An account is created with exactly one identity and shall hold at least one at every moment of its life: `Account.create` takes a single identity; hydrating or serializing an account with an empty identity list shall throw `InvalidArgument` ("An account requires at least one identity.").
- An account shall hold **at most one identity per provider**: adding a second identity of a provider the account already has shall throw `Conflict`. One password, one phone, one of each oauth provider — several passwords on one account multiply the attack surface to the weakest one, and a silently added second credential is a session-hijack persistence technique.
- Identities shall be removed only through the Account entity; removing an account's last identity shall delete the account itself, never leave it identity-less.

### 4.2 Requests, all providers

- The module shall accept exactly one `provider` per request and shall reject an unknown or missing provider with `400` (`"provider is required"`, `"Unknown provider: <value>"`). A non-string `provider` is an unknown provider.
- The module shall compute the password hash even when the registration is silenced as a duplicate, so a duplicate answer costs the caller the same time as a fresh one so we prevent sniffing if an account exists.
- The module shall validate every `providerData` field for presence and type before doing anything else, naming the field and provider in the `400` message (`"<field> is required for <provider> provider"`, `"<field> must be a string for <provider> provider"`).
- The module shall lowercase the email of the `password` provider (and of the Apple `user` object) before validation and storage.
- The module shall normalize a phone to E.164 only when it already carries an international prefix (`+` or `00`); a national number without one shall be rejected with `400` rather than completed with a guessed country code.
- When any rule fails, the module shall persist nothing.
- For providers whose identity is created unverified (`password`, `phone`), the module shall answer `202` even when the primary contact already belongs to an account: the duplicate shall be logged but never revealed to the caller.

### 4.3 `password`

- The module shall require a well-formed email and a password of at least 8 characters, maximum 72 bytes (bcrypt silently ignores anything beyond 72), satisfying the configured composition rules (§3.4).
- The module shall create an enabled account whose primary email is the given email and whose only identity is a `password` identity holding a bcrypt hash of the password. The plain password shall never be stored or logged.
- The `password` identity holds no email of its own: the account's primary email is the login identifier (§3.2).
- The identity shall be created **unverified** (`verifiedAt` empty).
- The module shall send a verification email which should have a link (`<PUBLIC_URL>/verify?token=…`).
- For a duplicate the module shall send the existing owner an "someone tried to register with your email" message instead — the pattern public consumer services use.
- The token shall be single use with 24h lifetime. We will make a cron for this, so no need for a special field. The identity createdAt will suffice.
- The account module shall ask the communication context through a port (VerificationMessageSender), never by importing it (context map §2).

### 4.4 `phone`

- The module shall require a well-formed phone number.
- The module shall create an enabled account whose primary phone is the given phone and whose only identity is a `phone` identity holding a `code` of the configured length (§3.4).
- The `phone` identity holds no phone number of its own: the account's primary phone is the login identifier (§3.2).
- The identity shall be created **unverified** (`verifiedAt` empty).
- The module shall send a verification whatsapp message which should have a link (`<PUBLIC_URL>/verify?code=…`).
- For a duplicate the module shall send the existing owner an "someone tried to register with your phone number" whatsapp message instead — the pattern public consumer services use.
- The code shall be single use with 24h lifetime.
- The account module shall ask the communication context through a port (VerificationMessageSender), never by importing it (context map §2).

### 4.5 `apple`, `google`, `meta`

**OAuth registration (issue #2: "validate immediately, logging the user in").**

- The module shall verify the provider's token server-side (Apple: `id_token` signature against Apple's keys plus `code` exchange; Google: `id_token` against Google's keys; Meta: `accessToken` via the Graph API `debug_token`) and shall take `providerUserId` and the email **from the provider's answer, never from the request body**.
- The identity is created **verified**; the provider's email becomes the primary email.
- The module shall return `409` if the oauth email already exists in an account. Account linking should be implemented later from another endpoint (§6).
- "Logging the user in" needs a session or token model that the repository does not have yet.
- Until the flow above exists, the module shall reject `apple`, `google` and `meta` registrations loudly (`501`), but only **after** the `providerData` shape has passed §4.2 validation, so callers integrate against the final contract from day one.

### 4.6 Persistence

- The account repository shall enforce uniqueness of the primary email and of the primary phone atomically in the storage engine itself — a find-then-insert check alone is not conformant (two concurrent registrations must not both persist). This should search identities and accounts as well (identity-held contacts are the oauth providers' asserted emails).
- Accounts without a primary email (or phone) shall not be constrained against each other: only present values are unique.
- A storage-level uniqueness violation shall surface as the same duplicate-contact domain error as the lookup path (§5), on both create and update (with a different id than the one we are editing, of course).
- Updating an account that was never created shall throw `NotFound('Account')`.

## 5. Errors

| condition | domain error | HTTP |
| --- | --- | --- |
| malformed body, missing/mistyped field, unknown provider, invalid email or phone format, short password | `InvalidArgument` (message as in §4) | `400` |
| primary email or phone already registered (password/phone) | `DuplicateContact('email')` / `DuplicateContact('phone')` | always `202`, silenced by the HTTP layer |
| primary email or phone already registered (oauth) | `DuplicateContact('email')` / `DuplicateContact('phone')` | `409` |
| provider whose flow is not implemented | `NotImplemented` | `501`, empty body |
| unexpected failure (database, provider unreachable) | `ServerError` | `500` |

`DuplicateContact` extends `Conflict` and is the **only** error the register HTTP layer silences: any other `Conflict` still answers `409`. The `@core` HTTP error handler maps `NotImplemented` to `501` with an empty body.

## 6. Non-goals

This version does not require: login or sessions of any kind; multi-factor authentication; linking a second identity to an existing account (a second provider for the same email is a `202` or `409`, not a link); password reset or change; one-time login links; changing or removing a primary email or phone; disabling or deleting accounts through the API; rate limiting of registration or code requests; administrative listing of accounts.

## 7. Conformance

An implementation conforms if it satisfies sections 3–5 and passes the gauntlet.
The tests that currently embody §3–§4 are test/account/1.0/** (the per-provider registration strategies under application/useCase/registration/, the register envelope, the error responder, the repository port contract suite, and container wiring); a rule added to §4 is expected to arrive with its test.
