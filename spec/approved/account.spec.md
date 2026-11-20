# Account Specification

Authored and edited by Daniel only. Agents: read-only. Implementation conforms to this document; when they disagree, this document wins.

## 1. Purpose

The account module owns who a user is. An **Account** is the user: enabled or disabled, with a primary email and/or a primary phone. An **Identity** is one way that account proves itself — email and password, a phone number, or an external provider (Apple, Google, Meta). Each identity can be verified or unverified. An account holds at least one identity.

Login is how an account proves one of its identities and receives tokens. A caller presents the credential of one identity provider; when the credential is proven and the identity may log in, the module answers with a short-lived access token and a longer-lived refresh token. Both are signed tokens the server never stores: there is no session, and the only token state the server keeps is the record of what it revoked (§4.20).

An access token authenticates the caller of a protected endpoint, of this module or of any other, until it expires or is revoked. Logout is how a login ends before its tokens expire: the caller revokes the tokens of one login, or every token of the account.

Verification is how an identity proves that its owner controls the contact behind it. Each identity declares how it becomes verified: when it is created, through a verification link, or by the first login credential it proves.

This version of the specification covers the module shape, the domain model, registration, identity verification, login and tokens, the authentication of protected requests, logout and token revocation, and the request throttling of the module's endpoints. A reference written "core §x" points to `core.spec.md`.

## 2. Scope

Defines: the account module structure (split between self and user submodules inside each hexagonal layer when needed), the domain shapes (entities, identity variants, value objects), the module configuration, the register, verify, login, login code, token refresh and logout endpoint contracts, the payload each provider sends, the account and identity created per provider, how identities become verified, the tokens and their claims, the login challenge behind one-time codes, when an access token authenticates a protected request, how tokens are revoked and how long a revocation is kept, the ports and adapters, the persistence guarantees, which of the module's endpoints are throttled and with what limits, and the error responses.

Does not define: how each handler works internally, how database connections are managed, how request throttling works (core §4.8), how the `Authorization` header of a protected request is read (core §4.9), what an authenticated caller is allowed to do on another module's endpoint (each module decides for its own), the delivery of messages (the communication context), multi-factor authentication, linking a second identity to an existing account, password reset, one-time login links, changing a primary email or phone, or administration of accounts (see §6).

## 3. Contract

### 3.1 Module shape

The infrastructure separates each submodule's handlers. Layers follow the hexagonal architecture and the code-style skill.

### 3.2 Domain shapes

- The domain has the `Account` and `Identity` entities.
- `Account` extends `TimestampedEntity` and carries: `disabledAt` (nullable date), `identities` (list of identities), `primaryEmail` (nullable email), `primaryPhone` (nullable phone).
- Every identity variant extends `TimestampedEntity` through a shared base carrying: `provider` (one of `apple` | `google` | `meta` | `password` | `phone`), `verifiedAt` (nullable date), `disabledAt` (nullable date).
- Per-provider identity data, on top of the base, and the verification mode each variant declares:

| provider | identity data | verification mode |
| --- | --- | --- |
| `password` | `password` (bcrypt hash), `hash` (the single-use token for the verification link) | `BY_LINK` |
| `phone` | none | `BY_LOGIN` |
| `apple` / `google` / `meta` | `email` (the provider's asserted email), `providerUserId`, other fields depending the oauth provider | `ON_CREATION` |

- `IDENTITY_VERIFICATION_MODES` is the string enum of how an identity becomes verified: `BY_LINK = 'link'` (a separate proof through the verify endpoint of §3.10, which never logs in), `BY_LOGIN = 'login'` (the first login credential the identity proves verifies it, §4.9), `ON_CREATION = 'creation'` (the identity is created verified, because the provider asserted it). Every identity variant answers its own mode through `getVerificationMode()`; no code outside the identity decides a verification behavior from the `provider` discriminant.
- The `password` and `phone` identities carry NO contact of their own: the account's `primaryEmail`/`primaryPhone` IS the login identifier, so a credential can never bind a stale contact (a recycled email or number must never keep logging in). OAuth identities keep their `email` because there it is the provider's asserted record, which may legitimately differ from the primary.
- A verification code is a string of decimal digits only, produced with a cryptographically secure random source, with configurable length (§3.4). It is the value of a login code (§4.11).
- Password composition rules are a value object holding minimum counts of digits, lowercase letters, uppercase letters, and symbols; each count is a non-negative integer.
- `THROTTLE_SCOPES` is the string enum of the module's throttle scopes, each a core `ThrottleScope` (core §3.2): `LOGIN = 'account.login'`, `LOGIN_CODE = 'account.loginCode'`, `REGISTER = 'account.register'`, `VERIFY = 'account.verify'`.
- Hydration from primitives shall restore the concrete identity variant for its `provider` discriminant. Creation sites that know the concrete variant statically shall call that variant's own `create` — never a generic factory.
- `LoginChallenge` extends `TimestampedEntity`. It is one code sent to one identity, and carries:

| field | type | meaning |
| --- | --- | --- |
| `accountId` | `Uuid` | the account being challenged |
| `provider` | `IDENTITY_PROVIDERS` | the identity being challenged; `phone` is the only provider that creates challenges |
| `codeHash` | string | the bcrypt hash of the code |
| `expiresAt` | date | the creation instant plus the code lifetime (§3.4) |
| `attemptCount` | non-negative integer | the code submissions counted against this challenge |
| `consumedAt` | nullable date | set when a submission matched the code |
| `supersededChallengeId` | nullable `Uuid` | the challenge that was the latest of this account and provider when this one was created; empty when there was none |

- A challenge is **active** while it is not consumed, not expired, and its attempt count is below the configured maximum.
- `LoginChallengePolicy` is a value object holding `lifetimeSeconds`, `maximumAttempts` and `resendIntervalSeconds`, within the ranges of §3.4.
- `LoginNotAllowed` extends `Forbidden` and carries a reason, one of `account disabled`, `identity disabled`, `identity not verified`. Its message is `Login not allowed. Reason: <reason>.`

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
| `429 Too Many Requests` | `"Too many requests."` | the client address exceeded the throttle (§4.7, scope `register`) |
| `501 Not Implemented` | empty | the functionality is not implemented |
| `500 Internal Server Error` | `"Unknown error"` | anything the module did not anticipate |

Unknown body fields, at any depth, are ignored. Field names inside `providerData` are the provider's own (snake_case for Google, camelCase for Meta) and are not translated.

Machine-readable form of §3.3, §3.6–§3.8 and §3.10–§3.12: `spec/approved/account.openapi.yaml` (OpenAPI 3.1). The tables in those sections are the contract; the OpenAPI document mirrors them and, when they disagree, the prose wins.

### 3.4 Configuration

Every variable is optional with the documented default, except the one marked required; a value outside its range shall abort startup with a `ServerError` naming the variable. `ACCOUNT_JWT_SECRET` is read through `TokenSigningConfig`, every other variable through `AccountConfig` (§3.5).

| variable | default | range | meaning |
| --- | --- | --- | --- |
| `ACCOUNT_PASSWORD_MINIMUM_DIGITS` | `0` | `>= 0` | minimum digits in a password |
| `ACCOUNT_PASSWORD_MINIMUM_LOWERCASE` | `0` | `>= 0` | minimum lowercase letters in a password |
| `ACCOUNT_PASSWORD_MINIMUM_UPPERCASE` | `0` | `>= 0` | minimum uppercase letters in a password |
| `ACCOUNT_PASSWORD_MINIMUM_SYMBOLS` | `0` | `>= 0` | minimum symbols in a password |
| `ACCOUNT_PHONE_VERIFICATION_CODE_LENGTH` | `6` | `>= 1` | digits in a login code |
| `ACCOUNT_THROTTLE_WINDOW_SECONDS` | `300` | `>= 1` | length of a throttle window (§4.7) |
| `ACCOUNT_THROTTLE_MAXIMUM_REQUESTS` | `20` | `>= 1` | requests one client address may send to one throttled endpoint inside a window (§4.7) |
| `ACCOUNT_JWT_SECRET` | none, required | at least 32 characters | the secret that signs and verifies both tokens |
| `ACCOUNT_ACCESS_TOKEN_LIFETIME_SECONDS` | `900` | `>= 60` | lifetime of an access token |
| `ACCOUNT_REFRESH_TOKEN_LIFETIME_SECONDS` | `2592000` | greater than the access token lifetime | lifetime of a refresh token, and so the longest a login lasts |
| `ACCOUNT_LOGIN_CODE_LIFETIME_SECONDS` | `300` | `>= 30` | validity of a login code |
| `ACCOUNT_LOGIN_CODE_MAXIMUM_ATTEMPTS` | `5` | `>= 1` | code submissions allowed against one challenge |
| `ACCOUNT_LOGIN_CODE_RESEND_INTERVAL_SECONDS` | `60` | `>= 0`, at most the code lifetime | minimum time between two codes sent to the same identity, unless the earlier code was used to log in (§4.11) |

### 3.5 Ports and adapters

| port | operations | adapter | scope |
| --- | --- | --- | --- |
| `AccountRepository` / `ACCOUNT_REPOSITORY` | `create(account)`, `update(account)`, `delete(id: Uuid)`, `findById(id: Uuid)`, `findByEmail(email: Email)`, `findByPhone(phone: Phone)`; lookups return `Nullable<Account>`, writes return `void` | `AccountRepositoryMongo` | singleton |
| `Encrypter` / `ENCRYPTER` | `encrypt(plainText): Promise<string>`, `compare(plainText, hashedText): Promise<boolean>` | `EncrypterBcrypt` | singleton |
| `AccountConfig` / `ACCOUNT_CONFIG` (also `STARTUP_CONFIG_VALIDATION`) | `getPasswordCompositionRules()`, `getVerificationCodeLength()`, `getThrottlePolicy()` (a core `ThrottlePolicy`, core §3.3), `getAccessTokenLifetimeSeconds()`, `getRefreshTokenLifetimeSeconds()`, `getLoginChallengePolicy()` | `AccountConfigEnvironment` | singleton |
| `RegistrationStrategyRegistry` / `REGISTRATION_STRATEGY_REGISTRY` | `Record<IDENTITY_PROVIDERS, RegistrationStrategy>`; a strategy is `register(rawProviderData: unknown): Promise<Account>` | `AppleRegistration`, `GoogleRegistration`, `MetaRegistration`, `PasswordRegistration`, `PhoneRegistration`, assembled in the wiring | singleton |
| `VerificationMessageSender` | sends the verification and duplicate-attempt messages of §4.3 and §4.4 | the communication context's in-process adapter (context map §2) | singleton |
| `TokenIssuer` / `TOKEN_ISSUER` | `issueAccessToken(accountId: Uuid)`, `issueRefreshToken(accountId: Uuid, provider: IDENTITY_PROVIDERS)`; both resolve an `IssuedToken` = `{expiresInSeconds: number; token: string}` | `TokenIssuerJsonWebToken` | singleton |
| `RefreshTokenVerifier` / `REFRESH_TOKEN_VERIFIER` | `verify(token: string)` resolves `RefreshTokenClaims` = `{accountId: Uuid; expiresAt: Date; issuedAt: Date; provider: IDENTITY_PROVIDERS; tokenId: Uuid}` or throws `Unauthorized('Invalid refresh token')` | `RefreshTokenVerifierJsonWebToken` | singleton |
| `AccessTokenVerifier` / `ACCESS_TOKEN_VERIFIER` | `verify(token: string)` resolves `AccessTokenClaims` = `{accountId: Uuid; expiresAt: Date; issuedAt: Date; tokenId: Uuid}` or throws `Unauthorized('Invalid access token')` | `AccessTokenVerifierJsonWebToken` | singleton |
| `TokenRevocationRepository` / `TOKEN_REVOCATION_REPOSITORY` | `revokeToken(tokenId: Uuid, expiresAt: Date)`, `revokeTokensOfAccount(accountId: Uuid, issuedUntil: Date, expiresAt: Date)`, `isRevoked(revocableToken: RevocableToken)`, with `RevocableToken` = `{accountId: Uuid; issuedAt: Date; tokenId: Uuid}`; the writes return `void`, the lookup returns `boolean` (§4.20) | `TokenRevocationRepositoryMongo` | singleton |
| `AccessTokenAuthenticator` / `ACCESS_TOKEN_AUTHENTICATOR` (a port of `@core`, core §3.6) | `authenticate(accessToken: string)` resolves the core `Authentication`, with the account id as its `subjectId`, by running `AuthenticateAccessToken` | `AccessTokenAuthenticatorInProcess` | singleton |
| `TokenSigningConfig` / `TOKEN_SIGNING_CONFIG` (also `STARTUP_CONFIG_VALIDATION`) | `getSigningSecret(): string` | `TokenSigningConfigEnvironment` | singleton |
| `LoginChallengeRepository` / `LOGIN_CHALLENGE_REPOSITORY` | `create(loginChallenge)`, `findLatestByAccount(accountId: Uuid, provider: IDENTITY_PROVIDERS)`, `claimAttempt(id: Uuid, maximumAttempts: number)`, `consume(id: Uuid)`; the lookup returns `Nullable<LoginChallenge>`, the writes return `void`; `create`, `claimAttempt` and `consume` throw `Conflict` when they take no effect (§4.15) | `LoginChallengeRepositoryMongo` | singleton |
| `LoginCodeSender` / `LOGIN_CODE_SENDER` | `sendPhoneLoginCode(phone: Phone, code: VerificationCode): Promise<void>` | the communication context's in-process adapter (context map §2) | singleton |
| `LoginStrategyRegistry` / `LOGIN_STRATEGY_REGISTRY` | `Record<IDENTITY_PROVIDERS, LoginStrategy>`; a strategy is `authenticate(rawProviderData: unknown): Promise<AuthenticatedIdentity>`, with `AuthenticatedIdentity` = `{account: Account; identity: Identity}` | `AppleLogin`, `GoogleLogin`, `MetaLogin`, `PasswordLogin`, `PhoneLogin`, assembled in the wiring | singleton |
| `LoginCodeRequestStrategyRegistry` / `LOGIN_CODE_REQUEST_STRATEGY_REGISTRY` | `Partial<Record<IDENTITY_PROVIDERS, LoginCodeRequestStrategy>>`; a strategy is `request(rawProviderData: unknown): Promise<void>` | `PhoneLoginCodeRequest`, assembled in the wiring | singleton |
| `VerificationStrategyRegistry` / `VERIFICATION_STRATEGY_REGISTRY` | `Partial<Record<IDENTITY_PROVIDERS, VerificationStrategy>>`; a strategy is `verify(rawProviderData: unknown): Promise<Account>`, resolving the account whose identity it verified | `PasswordVerification`, assembled in the wiring | singleton |

The use cases behind the endpoints are bound to themselves:

- `Register.run(input: unknown)` parses the envelope, selects the strategy for `provider`, and persists the account the strategy returns.
- `VerifyIdentity.run(input: unknown)` parses the envelope, selects the verification strategy for `provider`, and persists the account the strategy returns.
- `Login.run(input: unknown)` parses the envelope, selects the strategy for `provider`, applies §4.9 to what the strategy proved, persisting the account when the proof verified its identity, and issues the two tokens.
- `RequestLoginCode.run(input: unknown)` parses the envelope and selects the code request strategy for `provider`.
- `RefreshAccessToken.run(input: unknown)` applies §4.14.
- `AuthenticateAccessToken.run(accessToken: string)` applies §4.18 and resolves the `AccessTokenClaims` of the token.
- `Logout.run(authentication: Authentication, input: unknown)` applies §4.19 to the tokens of one login.
- `LogoutEverywhere.run(authentication: Authentication)` applies §4.19 to every token of the account.

The module declares no throttle port of its own: it consumes the `RequestThrottle` port and the `throttle` middleware of `@core` (core §3.6, §3.9.10).

The module declares no authentication middleware of its own either. It binds the `AccessTokenAuthenticator` port of `@core`, so that core's `authenticate` middleware (core §3.9.11) authenticates the protected endpoints of every module with this module's access tokens, and it protects its own endpoints with that same middleware. `Authentication` is the core type of core §3.6.

### 3.6 Login endpoint

`POST /auth/login` — JSON body, `Content-Type: application/json`, in the envelope of §3.3.

| provider | providerData | source of the shape |
| --- | --- | --- |
| `password` | `{"email": string, "password": string}` | the account's primary email and its password |
| `phone` | `{"phone": string, "code": string}` | the account's primary phone in international form, and the code obtained through §3.7 |
| `apple` / `google` / `meta` | the shapes of §3.3 | the provider's response, verbatim |

Responses:

| status | body | when |
| --- | --- | --- |
| `200 OK` | `{"accessToken": string, "expiresIn": number, "refreshExpiresIn": number, "refreshToken": string, "tokenType": "Bearer"}` | the credential is proven and the identity may log in (§4.9). `expiresIn` and `refreshExpiresIn` are the lifetimes of the two tokens in seconds |
| `400 Bad Request` | JSON string with the reason | the body is malformed or fails a rule in §4.8 |
| `401 Unauthorized` | `"Unauthorized. Reason: Invalid credentials."` | the credential is not proven (§4.10, §4.12, §4.13) |
| `403 Forbidden` | `"Login not allowed. Reason: <reason>."` | the credential is proven and the account or the identity may not log in (§4.9) |
| `429 Too Many Requests` | `"Too many requests."` | the client address exceeded the throttle (§4.7, scope `login`) |
| `501 Not Implemented` | empty | the provider's flow is not implemented (§4.13) |
| `500 Internal Server Error` | `"Unknown error"` | anything the module did not anticipate |

Unknown body fields, at any depth, are ignored.

### 3.7 Login code endpoint

`POST /auth/login/code` — JSON body in the envelope of §3.3. It sends a one-time login code to the owner of an identity.

| provider | providerData | source of the shape |
| --- | --- | --- |
| `phone` | `{"phone": string}` | the account's primary phone in international form |

Responses:

| status | body | when |
| --- | --- | --- |
| `202 Accepted` | empty | a code was sent |
| `202 Accepted` | empty (the use case threw `NotFound`, `LoginNotAllowed` or `TooManyRequests` and the HTTP layer silenced it) | the phone belongs to no account, the account has no `phone` identity, the account or the identity may not be sent a code (§4.11), or a code was requested less than the resend interval ago (§4.11) |
| `400 Bad Request` | JSON string with the reason | the body is malformed, fails a rule in §4.8, or names a provider that sends no codes (`"<provider> provider does not send login codes"`) |
| `429 Too Many Requests` | `"Too many requests."` | the client address exceeded the throttle (§4.7, scope `loginCode`) |
| `501 Not Implemented` | empty | code delivery is not implemented (§4.11) |
| `500 Internal Server Error` | `"Unknown error"` | anything the module did not anticipate |

### 3.8 Token refresh endpoint

`POST /auth/token/refresh` — JSON body `{"refreshToken": string}`.

| status | body | when |
| --- | --- | --- |
| `200 OK` | `{"accessToken": string, "expiresIn": number, "tokenType": "Bearer"}` | the refresh token is valid, is not revoked, and its identity may log in (§4.14) |
| `400 Bad Request` | JSON string with the reason | the body is malformed, or `refreshToken` is missing (`"refreshToken is required"`) or not a string (`"refreshToken must be a string"`) |
| `401 Unauthorized` | `"Unauthorized. Reason: Invalid refresh token."` | the refresh token is not valid, is revoked, or its account or identity no longer exists (§4.14) |
| `403 Forbidden` | `"Login not allowed. Reason: <reason>."` | the refresh token is valid and the account or the identity may not log in (§4.9) |
| `500 Internal Server Error` | `"Unknown error"` | anything the module did not anticipate |

### 3.9 Tokens

Both tokens are JSON Web Tokens (RFC 7519) signed with the `HS256` algorithm and the signing secret of §3.4.

| claim | access token | refresh token | value |
| --- | --- | --- | --- |
| `iss` | yes | yes | the API name (`CoreConfig.getApiName()`) |
| `sub` | yes | yes | the account id |
| `jti` | yes | yes | a version 4 UUID, unique per token |
| `iat` | yes | yes | the issue instant, in seconds |
| `exp` | yes | yes | `iat` plus the token's lifetime (§3.4) |
| `token_use` | `access` | `refresh` | which of the two tokens this is |
| `provider` | no | yes | the identity provider whose credential was proven at login |

A token carries no other claim. `tokenType` is `Bearer`: the access token is meant for the `Authorization: Bearer <accessToken>` header (RFC 6750).

### 3.10 Verify endpoint

`POST /auth/verify` — JSON body in the envelope of §3.3. It verifies an identity whose verification mode is `BY_LINK` (§3.2). It issues no token: the caller logs in afterwards.

| provider | providerData | source of the shape |
| --- | --- | --- |
| `password` | `{"email": string, "hash": string}` | the account's primary email and the token of the verification link (§4.3) |

Responses:

| status | body | when |
| --- | --- | --- |
| `204 No Content` | empty | the identity was verified (§4.17) |
| `400 Bad Request` | `"Invalid or expired verification"` | the verification is not proven (§4.17) |
| `400 Bad Request` | JSON string with the reason | the body is malformed, fails a rule in §4.17, or names a provider that has no verification step (`"<provider> provider has no verification step"`) |
| `429 Too Many Requests` | `"Too many requests."` | the client address exceeded the throttle (§4.7, scope `verify`) |
| `500 Internal Server Error` | `"Unknown error"` | anything the module did not anticipate |

Unknown body fields, at any depth, are ignored.

### 3.11 Logout endpoint

`POST /auth/logout` — protected: header `Authorization: Bearer <accessToken>` (§4.18). JSON body `{"refreshToken": string}`. It ends one login: it revokes the access token of the header and the refresh token of the body.

| status | body | when |
| --- | --- | --- |
| `204 No Content` | empty | both tokens are revoked (§4.19) |
| `400 Bad Request` | JSON string with the reason | the body is malformed, or `refreshToken` is missing (`"refreshToken is required"`) or not a string (`"refreshToken must be a string"`) |
| `401 Unauthorized` | `"Unauthorized. Reason: Missing access token."` | the request carries no bearer token (core §4.9) |
| `401 Unauthorized` | `"Unauthorized. Reason: Invalid access token."` | the access token is not valid or is revoked (§4.18) |
| `401 Unauthorized` | `"Unauthorized. Reason: Invalid refresh token."` | the refresh token is not valid, or is not a token of the account the access token authenticates (§4.19) |
| `500 Internal Server Error` | `"Unknown error"` | anything the module did not anticipate |

Unknown body fields are ignored.

### 3.12 Logout everywhere endpoint

`POST /auth/logout/all` — protected: header `Authorization: Bearer <accessToken>` (§4.18). It takes no body, and ignores one. It ends every login of the account: it revokes every token issued to the account up to that moment, the access token of the header included.

| status | body | when |
| --- | --- | --- |
| `204 No Content` | empty | every token of the account is revoked (§4.19) |
| `401 Unauthorized` | `"Unauthorized. Reason: Missing access token."` | the request carries no bearer token (core §4.9) |
| `401 Unauthorized` | `"Unauthorized. Reason: Invalid access token."` | the access token is not valid or is revoked (§4.18) |
| `500 Internal Server Error` | `"Unknown error"` | anything the module did not anticipate |

## 4. Behavior

### 4.1 Entities

- The Account entity shall extend from TimestampedEntity.
- The Identity entity shall extend from TimestampedEntity.
- An identity shall refuse to be verified twice and refuse to be enabled or disabled twice (`Conflict`).
- An account is created with exactly one identity and shall hold at least one at every moment of its life: `Account.create` takes a single identity; hydrating or serializing an account with an empty identity list shall throw `InvalidArgument` ("An account requires at least one identity.").
- An account shall hold **at most one identity per provider**: adding a second identity of a provider the account already has shall throw `Conflict`. One password, one phone, one of each oauth provider — several passwords on one account multiply the attack surface to the weakest one, and a silently added second credential is a session-hijack persistence technique.
- Identities shall be removed only through the Account entity; removing an account's last identity shall delete the account itself, never leave it identity-less.

### 4.2 Registration requests, all providers

- The module shall accept exactly one `provider` per request and shall reject an unknown or missing provider with `400` (`"provider is required"`, `"Unknown provider: <value>"`). A non-string `provider` is an unknown provider.
- The module shall compute the password hash even when the registration is silenced as a duplicate, so a duplicate answer costs the caller the same time as a fresh one so we prevent sniffing if an account exists.
- The module shall validate every `providerData` field for presence and type before doing anything else, naming the field and provider in the `400` message (`"<field> is required for <provider> provider"`, `"<field> must be a string for <provider> provider"`).
- The module shall lowercase the email of the `password` provider (and of the Apple `user` object) before validation and storage.
- The module shall normalize a phone to E.164 only when it already carries an international prefix (`+` or `00`); a national number without one shall be rejected with `400` rather than completed with a guessed country code.
- When any rule fails, the module shall persist nothing.
- For providers whose identity is created unverified (`password`, `phone`), the module shall answer `202` even when the primary contact already belongs to an account: the duplicate shall be logged but never revealed to the caller.

### 4.3 Registration with `password`

- The module shall require a well-formed email and a password of at least 8 characters, maximum 72 bytes (bcrypt silently ignores anything beyond 72), satisfying the configured composition rules (§3.4).
- The module shall create an enabled account whose primary email is the given email and whose only identity is a `password` identity holding a bcrypt hash of the password. The plain password shall never be stored or logged.
- The `password` identity holds no email of its own: the account's primary email is the login identifier (§3.2).
- The identity shall be created **unverified** (`verifiedAt` empty).
- The module shall send a verification email which should have a link (`<PUBLIC_URL>/verify?email=…&hash=…`) carrying the two values the verify endpoint takes (§3.10).
- For a duplicate the module shall send the existing owner an "someone tried to register with your email" message instead — the pattern public consumer services use.
- The token shall be single use with 24h lifetime (§4.17). We will make a cron for this, so no need for a special field. The identity createdAt will suffice.
- The account module shall ask the communication context through a port (VerificationMessageSender), never by importing it (context map §2).

### 4.4 Registration with `phone`

- The module shall require a well-formed phone number.
- The module shall create an enabled account whose primary phone is the given phone and whose only identity is a `phone` identity.
- The `phone` identity holds no phone number of its own: the account's primary phone is the login identifier (§3.2).
- The identity shall be created **unverified** (`verifiedAt` empty).
- The module shall send no verification message and shall store no verification code: a `phone` identity becomes verified when its owner first logs in with a code (§4.9, §4.12), which the client requests through the login code endpoint (§3.7).
- For a duplicate the module shall send the existing owner an "someone tried to register with your phone number" whatsapp message instead — the pattern public consumer services use.
- The account module shall ask the communication context through a port (VerificationMessageSender), never by importing it (context map §2).

### 4.5 Registration with `apple`, `google`, `meta`

**OAuth registration (issue #2: "validate immediately, logging the user in").**

- The module shall verify the provider's token server-side (Apple: `id_token` signature against Apple's keys plus `code` exchange; Google: `id_token` against Google's keys; Meta: `accessToken` via the Graph API `debug_token`) and shall take `providerUserId` and the email **from the provider's answer, never from the request body**.
- The identity is created **verified**; the provider's email becomes the primary email.
- The module shall return `409` if the oauth email already exists in an account. Account linking should be implemented later from another endpoint (§6).
- Registration issues no tokens (§6); the caller logs in afterwards.
- Until the flow above exists, the module shall reject `apple`, `google` and `meta` registrations loudly (`501`), but only **after** the `providerData` shape has passed §4.2 validation, so callers integrate against the final contract from day one.

### 4.6 Persistence of accounts

- The account repository shall enforce uniqueness of the primary email and of the primary phone atomically in the storage engine itself — a find-then-insert check alone is not conformant (two concurrent registrations must not both persist). This should search identities and accounts as well (identity-held contacts are the oauth providers' asserted emails).
- Accounts without a primary email (or phone) shall not be constrained against each other: only present values are unique.
- A storage-level uniqueness violation shall surface as the same duplicate-contact domain error as the lookup path (§5), on both create and update (with a different id than the one we are editing, of course).
- Updating an account that was never created shall throw `NotFound('Account')`.

### 4.7 Request throttling

- The module shall throttle these endpoints per client address with the `throttle` middleware of `@core`, which defines how a request is counted and refused (core §4.8):

| endpoint | scope | `THROTTLE_SCOPES` member |
| --- | --- | --- |
| `POST /auth/register` | `register` | `REGISTER` |
| `POST /auth/login` | `login` | `LOGIN` |
| `POST /auth/login/code` | `loginCode` | `LOGIN_CODE` |
| `POST /auth/verify` | `verify` | `VERIFY` |

- Every scope shall use the one policy of §3.4, `AccountConfig.getThrottlePolicy()`. Each scope is counted on its own.
- Every request that reaches a throttled endpoint shall count, whatever its outcome, and the throttle shall be evaluated before the body is validated.
- A request beyond the maximum shall answer `429` with the body `"Too many requests."` and the header `Retry-After`. The module shall do nothing else for that request: no validation, no lookup, no hash, no message.
- The throttle answer shall never depend on whether an account exists.
- `POST /auth/token/refresh`, `POST /auth/logout` and `POST /auth/logout/all` are not throttled: only a token the module signed passes, so there is nothing to guess.

### 4.8 Login requests, all providers

- The login and login code endpoints shall apply the provider rules of §4.2: exactly one `provider` per request, and an unknown or missing provider rejected with `400` and the same messages.
- The module shall validate every `providerData` field for presence and type before doing anything else, with the messages of §4.2 (`"<field> is required for <provider> provider"`, `"<field> must be a string for <provider> provider"`).
- The module shall lowercase the email of the `password` provider before validating it.
- The module shall normalize a phone exactly as §4.2 does: to E.164 only when it carries an international prefix (`+` or `00`), and a national number rejected with `400`.
- The module shall reject with `400` a login code that is not a string of decimal digits.
- The module shall apply no password length or composition rule at login, so a change of the registration rules never locks out an existing password. The only bound is the 72 bytes of §4.10.
- When a request fails a rule of this section, the module shall look up no account and shall issue no token.

### 4.9 Who may log in

- An identity may log in when its account is enabled, the identity is enabled, and the identity is verified. The module shall check the three in that order and shall throw `LoginNotAllowed` with the reason of the first that fails: `account disabled`, `identity disabled`, `identity not verified`.
- The module shall run this check only after the credential is proven, so the state of an account is revealed only to a caller who proved the credential.
- When a login credential is proven for an unverified identity whose verification mode is `BY_LOGIN` (§3.2), the module shall mark the identity verified and persist the account before running the check above: for such an identity, proving the login credential is the proof that its owner controls the contact. The module shall do so for every login strategy alike, by asking the identity for its mode, and whether or not the account or the identity is disabled. A proven credential shall never verify an identity of any other mode.
- When the credential is proven and the identity may log in, the module shall issue one access token and one refresh token (§3.9) for that account and provider.
- Every `200` answer of §3.6 and §3.8 shall carry the header `Cache-Control: no-store`.

### 4.10 Login with `password`

- The credential is proven when an account exists whose primary email is the given email, that account has a `password` identity, and the given password matches the identity's bcrypt hash.
- Only the primary email identifies an account for password login (§3.2). An account that holds the given email only as the asserted email of an oauth identity shall not match.
- A password longer than 72 bytes shall never be proven: bcrypt ignores every byte beyond 72, so it would otherwise match a shorter password.
- Every failure shall throw `Unauthorized('Invalid credentials')` — one message for an unknown email, a non-primary email, a missing `password` identity, a wrong password and an over-long password.
- Every path that answers `401` shall perform one bcrypt computation, so the answer time does not reveal whether the account exists.

### 4.11 Login with `phone` — requesting a code

- For a well-formed request the module shall, in this order:
  1. throw `NotFound('Account')` when the phone is the primary phone of no account, or that account has no `phone` identity;
  2. throw `LoginNotAllowed` when the identity may not be sent a code: with the reason `account disabled` or `identity disabled`, checked in that order, and with the reason `identity not verified` only for an unverified identity whose verification mode is not `BY_LOGIN`. An unverified identity whose mode is `BY_LOGIN` shall be sent a code, because proving that code is what verifies it (§4.9);
  3. throw `TooManyRequests` when the latest challenge of that account and provider was created less than the resend interval ago, unless a matching code consumed it;
  4. generate a code of the configured length with a cryptographically secure random source, create a challenge holding the bcrypt hash of the code and expiring one code lifetime later, and send the code through `LoginCodeSender`.
- The resend interval shall apply to a challenge whose attempts are used up, so exhausting the attempts never obtains a new code sooner. It shall not apply to a challenge a matching code consumed: an owner who has just logged in can request a new code at once.
- Only the latest challenge of an account and provider can prove a credential: a new challenge supersedes every earlier one.
- A new challenge shall record the challenge it supersedes: the latest of that account and provider that step 3 read, or none. When `create` throws `Conflict` (§4.15), another request superseded the same challenge first, and the module shall throw `TooManyRequests` and send no code. Of several concurrent requests for the same identity, exactly one shall create a challenge and send a code.
- The HTTP layer shall answer `202` when the code was sent, and shall silence exactly `NotFound`, `LoginNotAllowed` and `TooManyRequests` thrown by the use case into the same empty `202`, logging the warning `Silenced a login code request (<error message>)`. Every other error shall reach the error middleware. The `429` of the throttle (§4.7) is answered before the use case runs and is never silenced.
- The plain code shall never be stored or logged.
- When delivery fails, the error shall surface (`500`) and the challenge shall stay; a new code can be requested after the resend interval.
- A silenced request answers faster than one that sends a code. The difference is accepted: closing it would mean sending messages to people who did not ask for them.
- A provider absent from the code request registry shall be rejected with `400` (`"<provider> provider does not send login codes"`).
- Until the communication context provides the `LoginCodeSender` adapter (context map §2), the module shall answer `501` to every well-formed login code request, after the shape validation of §4.8 and before any account lookup, so the answer never depends on whether the phone belongs to an account.

### 4.12 Login with `phone` — logging in with a code

- The credential is proven when an account exists whose primary phone is the given phone, that account has a `phone` identity, the latest challenge of that account and provider is active, and the given code matches the challenge's hash.
- The module shall count the submission against the challenge before comparing the code (§4.15). A submission that cannot be counted, because the challenge is not active, shall not be compared.
- On a match the module shall consume the challenge before the verification and the check of §4.9 and before any token is issued: a code proves a credential once.
- The first code a `phone` identity proves verifies it (§4.9): registration and the first login need one code, never two.
- Every failure shall throw `Unauthorized('Invalid credentials')` — one message for an unknown phone, a missing `phone` identity, a missing or inactive challenge and a wrong code.
- Every path that answers `401` shall perform one bcrypt computation.

### 4.13 Login with `apple`, `google`, `meta`

- The module shall verify the provider's token server-side as §4.5 specifies, and shall find the identity by the provider and the `providerUserId` taken from the provider's answer. An identity that does not exist shall answer `401`; the module shall never match or link an identity by email.
- Until the provider verification exists, the module shall reject `apple`, `google` and `meta` logins with `501`, but only after the `providerData` shape has passed the validation of §4.8 with the shapes of §3.3.

### 4.14 Token refresh

- A refresh token is valid when its signature verifies with the signing secret under `HS256` and no other algorithm, it is not expired, its `iss` is the API name, its `token_use` is `refresh`, its `sub` is a UUID, its `jti` is a UUID, and its `provider` is an identity provider.
- A token that is not valid shall throw `Unauthorized('Invalid refresh token')` — one message for every cause, an access token presented as a refresh token included.
- A valid refresh token that is revoked (§4.20) shall throw the same `Unauthorized('Invalid refresh token')`. The module shall check it before loading the account.
- The module shall then load the account named by `sub` and its identity of the token's `provider`; when either does not exist it shall throw the same `Unauthorized('Invalid refresh token')`.
- The module shall then apply §4.9 to that account and identity. Disabling an account or an identity therefore ends its access within one access token lifetime.
- The module shall then issue a new access token, and shall never issue a new refresh token: a login lasts at most one refresh token lifetime, after which the caller logs in again.
- A refresh token is not a login credential: refreshing shall never verify an identity.

### 4.15 Tokens and challenges

- The module shall sign every token with `HS256` and the signing secret, and shall give every token its own `jti`.
- A token shall carry no claim beyond §3.9, and so no email, phone or other personal data.
- The signing secret shall never be logged and shall have no default: a missing or too short `ACCOUNT_JWT_SECRET` shall abort startup.
- `create` shall refuse, atomically in the storage engine itself, a challenge whose account, provider and superseded challenge equal those of a stored challenge, and shall throw `Conflict` without storing it. Two challenges that supersede nothing, for the same account and provider, are equal in this sense — a find-then-insert check alone is not conformant.
- `claimAttempt` shall increment the attempt count of an active challenge atomically in the storage engine itself, and shall throw `Conflict` without incrementing when the challenge is not active. Concurrent submissions shall never obtain, in total, more comparisons than the configured maximum — a find-then-update count alone is not conformant.
- `consume` shall set `consumedAt` atomically in the storage engine itself, and shall throw `Conflict` when the challenge is already consumed. Of several concurrent submissions of the right code, exactly one shall be proven.

### 4.16 Persistence of login challenges

- Login challenges shall live in their own collection, `accountLoginChallenges`, with the BSON UUID `_id` of core §4.6. Login shall write to the `accounts` collection only to record the verification of §4.9, and never otherwise.
- The storage engine shall delete a challenge once it has expired, through an expiry index on `expiresAt`. The index definition shall be constant and shall never depend on a configuration value, so changing a lifetime never requires rebuilding an index.
- The lookup of the latest challenge of an account and provider shall be served by an index.
- A challenge shall be treated as expired from its `expiresAt` on, whether or not the storage engine has deleted it yet.

### 4.17 Identity verification

- The verify endpoint shall apply the provider rules of §4.2: exactly one `provider` per request, and an unknown or missing provider rejected with `400` and the same messages.
- A provider absent from the verification registry shall be rejected with `400` (`"<provider> provider has no verification step"`). The registry shall hold a strategy only for providers whose identity declares the mode `BY_LINK` (§3.2).
- The module shall validate every `providerData` field for presence and type before doing anything else, with the messages of §4.2 (`"<field> is required for <provider> provider"`, `"<field> must be a string for <provider> provider"`).
- The module shall lowercase the email of the `password` provider before validating it, and shall reject a malformed email with `400`.
- When a request fails a rule above, the module shall look up no account.
- The verification of a `password` identity is proven when an account exists whose primary email is the given email, that account has a `password` identity, the identity is unverified, the identity was created less than 24 hours ago, and the given `hash` equals the identity's `hash`.
- Only the primary email identifies an account for verification (§3.2). An account that holds the given email only as the asserted email of an oauth identity shall not match.
- The identity itself shall decide whether a given `hash` proves it: the comparison, the 24 hours and the refusal of an already verified identity are rules of the `password` identity, not of the use case.
- The module shall compare the two hashes in constant time, so the answer time does not reveal how much of a hash is right.
- An identity shall be treated as expired from 24 hours after its `createdAt` on, whether or not anything has deleted it yet.
- When the verification is proven, the module shall mark the identity verified, persist the account, and answer `204` with an empty body. It shall issue no token.
- Every failure shall throw `InvalidArgument` with the message `Invalid or expired verification` — one message for an unknown email, a non-primary email, a missing `password` identity, an identity already verified, an identity older than 24 hours and a wrong hash. The module shall persist nothing.
- A hash verifies once: a verified identity is proven by no hash, so a second submission of the right hash answers the same `400`.
- Verification shall not depend on whether the account or the identity is disabled: it proves the contact, and §4.9 still decides who logs in.
- Verification is not a login: the module shall never issue a token for it (§6, one-time login links).

### 4.18 Authenticating a protected request

- An endpoint is protected when the `authenticate` middleware of `@core` runs before its handler (core §4.9). The middleware reads the bearer token; this module decides whether that token authenticates an account, through the `AccessTokenAuthenticator` port it binds (§3.5).
- An access token is valid when its signature verifies with the signing secret under `HS256` and no other algorithm, it is not expired, its `iss` is the API name, its `token_use` is `access`, its `sub` is a UUID, and its `jti` is a UUID.
- A token that is not valid shall throw `Unauthorized('Invalid access token')` — one message for every cause, a refresh token presented as an access token included.
- A valid access token that is revoked (§4.20) shall throw the same `Unauthorized('Invalid access token')`.
- The module shall check the revocation of every access token on every protected request, so a revocation takes effect on the next request and never waits for the token to expire.
- A token that authenticates resolves the core `Authentication` of core §3.6: `subjectId` is the account id (`sub`), `tokenId` is the `jti`, `issuedAt` is the `iat` and `expiresAt` is the `exp`.
- Authenticating a request shall not load the account: an access token is the proof that the account could log in when the token was issued or last refreshed. Disabling an account or an identity ends its access within one access token lifetime (§4.14), not at once.
- Authenticating a request shall never verify an identity, issue a token or write anything.
- The module's protected endpoints are `POST /auth/logout` and `POST /auth/logout/all`. Every other endpoint of the module is public.

### 4.19 Logout

- Both logout endpoints shall authenticate the request (§4.18) before anything else: before the body is validated and before any token is revoked.
- `POST /auth/logout` shall require `refreshToken` in the body, with the messages of §3.8 (`"refreshToken is required"`, `"refreshToken must be a string"`).
- The refresh token of a logout shall be valid in the sense of §4.14, and its `sub` shall be the account the access token authenticates. Otherwise the module shall throw `Unauthorized('Invalid refresh token')` and shall revoke nothing: a caller can end only its own login.
- The module shall not refuse a refresh token because it is already revoked: logging out twice with the same refresh token and a still valid access token answers `204` both times.
- The module shall then revoke the refresh token and then the access token of the request, each until its own `exp` (§4.20), and answer `204` with an empty body.
- Logout shall not load the account and shall not apply §4.9: a disabled account can still log out.
- Logout revokes the two tokens it is given, and no other. Another access token obtained earlier from the same refresh token stays usable until it expires, at most one access token lifetime later; the refresh token being revoked, it cannot be replaced. `POST /auth/logout/all` leaves no such token.
- `POST /auth/logout/all` shall revoke every token of the authenticated account whose `iat` is at or before the instant of the request, access and refresh tokens alike and the access token of the request included, and answer `204` with an empty body. It shall record that instant as the account's revocation cutoff (§4.20), kept for one refresh token lifetime (§3.4): the longest any token issued before it can still live.
- A token issued after the cutoff is not revoked by it: logging in again after `POST /auth/logout/all` works. `iat` counts whole seconds, so a token issued in the same second as the cutoff is revoked with the rest; the module shall err on that side.
- When a revocation cannot be stored, the error shall surface (`500`) and the caller repeats the request: revoking a token twice is not an error.

### 4.20 Token revocation

- A token is revoked when its `jti` was revoked through `revokeToken`, or when its account has a revocation cutoff and the token's `iat` is at or before it. `isRevoked` shall answer both in one call.
- `revokeToken` shall be idempotent: revoking a token that is already revoked shall take no effect and shall not throw.
- `revokeTokensOfAccount` shall keep one cutoff per account and shall only ever move it forward, atomically in the storage engine itself: of two concurrent calls the later instant shall stay, and a cutoff shall never be replaced by an earlier one — a find-then-update alone is not conformant.
- A revocation shall hold from the moment its write is acknowledged, and until the token it revokes has expired. It need not be kept longer: an expired token is refused for being expired.
- The module shall store no token and no part of one beyond its `jti`: a revocation record identifies a token and cannot be used to forge or replay it.
- Revocation shall fail closed. When `isRevoked` cannot answer, the error shall surface (`500`): a request shall never authenticate, and a refresh token shall never be exchanged, because the revocations could not be read.
- A token cannot be un-revoked: there is no operation that removes a revocation before it expires.

### 4.21 Persistence of token revocations

- Revoked tokens shall live in their own collection, `accountRevokedTokens`: one document per token, whose `_id` is the BSON UUID (core §4.6) of the token's `jti`, with the `expiresAt` of the revocation.
- Revocation cutoffs shall live in their own collection, `accountTokenCutoffs`: one document per account, whose `_id` is the BSON UUID of the account id, with the cutoff instant `issuedUntil` and the `expiresAt` of the revocation.
- The storage engine shall delete a document of either collection once it has expired, through an expiry index on `expiresAt`. The index definition shall be constant and shall never depend on a configuration value, so changing a lifetime never requires rebuilding an index.
- `isRevoked` shall be served by the `_id` index of each collection, and by nothing else.
- Logout and the authentication of a request shall never write to the `accounts` collection.

## 5. Errors

| condition | domain error | HTTP |
| --- | --- | --- |
| malformed body, missing or mistyped field, unknown provider, invalid email, phone or code format, short password, provider that sends no codes, provider that has no verification step | `InvalidArgument` (message as in §4) | `400` |
| the verification is not proven (§4.17) | `InvalidArgument('Invalid or expired verification')` | `400` |
| primary email or phone already registered (password/phone) | `DuplicateContact('email')` / `DuplicateContact('phone')` | always `202`, silenced by the HTTP layer |
| primary email or phone already registered (oauth) | `DuplicateContact('email')` / `DuplicateContact('phone')` | `409` |
| the credential is not proven | `Unauthorized('Invalid credentials')` | `401` |
| the refresh token is not valid, is revoked, or its account or identity no longer exists; at logout, the refresh token is not valid or belongs to another account | `Unauthorized('Invalid refresh token')` | `401` |
| a protected request carries no bearer token (core §4.9) | `Unauthorized('Missing access token')` | `401` |
| the access token of a protected request is not valid or is revoked | `Unauthorized('Invalid access token')` | `401` |
| the credential or the refresh token is proven, and the account or the identity may not log in | `LoginNotAllowed(<reason>)` | `403` |
| a login code request for an unknown phone, for an identity that may not be sent a code, or inside the resend interval | `NotFound('Account')`, `LoginNotAllowed(<reason>)`, `TooManyRequests` | always `202`, silenced by the HTTP layer |
| the client address exceeded the throttle (§4.7) | `TooManyRequests` | `429` with `Retry-After` |
| provider or delivery whose flow is not implemented | `NotImplemented` | `501`, empty body |
| unexpected failure (database, provider unreachable, delivery failure, a revocation that cannot be read or stored) | `ServerError` | `500` |

`DuplicateContact` extends `Conflict` and is the **only** error the register HTTP layer silences: any other `Conflict` still answers `409`. `LoginNotAllowed`, `NotFound` and `TooManyRequests` are the **only** errors the login code HTTP layer silences, and only when the use case throws them. The verify and logout HTTP layers silence nothing. Every `401` answer carries the header `WWW-Authenticate: Bearer` (core §4.5). The `@core` HTTP error handler maps `NotImplemented` to `501` with an empty body.

## 6. Non-goals

This version does not require: sessions, a list of the logins of an account, or ending one login the caller holds no token of (`POST /auth/logout/all` ends them all); revoking the access tokens obtained from a refresh token when that refresh token is revoked (§4.19); revoking tokens when an account or an identity is disabled (§4.14 ends that access within one access token lifetime); removing a revocation; renewing or rotating a refresh token; authorization by role, scope or permission (the middleware authenticates, each module decides what its caller may do); protecting an endpoint of this module beyond the two logout endpoints; asymmetric signing keys or key rotation; issuing tokens on registration or on verification; multi-factor authentication; linking a second identity to an existing account, at registration or at login (a second provider for the same email is a `202` or `409`, not a link); the provider token verification of §4.5; password reset or change; one-time login links; one-time codes by email; sending a verification email again, or a new one once the 24 hours of §4.17 have passed; removing the accounts whose identity was never verified; changing or removing a primary email or phone; disabling or deleting accounts through the API; throttling beyond the per-address throttle of §4.7 (counts shared between processes, and per-account lockout, which would let anyone lock an owner out); administrative listing of accounts.

## 7. Conformance

An implementation conforms if it satisfies sections 3–5 and passes the gauntlet. The tests that embody §3–§4 live under `test/account/1.0/**` (the per-provider registration, verification and login strategies, the use cases, the HTTP contract suites of every endpoint, the port contract suites, and container wiring); a rule added to §4 is expected to arrive with its test.
