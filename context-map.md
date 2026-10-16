# Context Map — dam/api

> Authored and edited by Daniel only. Agents: read this before touching ANY cross-context
> seam. Protected like `CLAUDE.md`, which imports it into every session.

## 1. Contexts

| Context | Responsibility (one line) | Owned data | Language notes |
|---|---|---|---|
| account | who a user is: accounts, their identities, registration and verification | MongoDB `accounts` | **Account** is the user; **Identity** is one way it proves itself (`password`, `phone`, `apple`, `google`, `meta`); the *primary* email/phone is the login identifier, an OAuth identity's `email` is the provider's asserted record |
| communication (planned, not in `src/` yet) | delivering messages to people over external channels (email, WhatsApp) | <to be declared with the module> | a *message* here is an outbound delivery, never a domain event |

`@core` is not a context: it is the cross-project standard library (`spec/approved/core.spec.md`)
and names no business concept.

## 2. Edges

Default patterns: Open Host Service + Published Language (`contract/`) between internal
contexts; Anti-Corruption Layer toward anything external or unstable (third-party APIs
count as external contexts).

| From → To | Pattern | Surface | Notes |
|---|---|---|---|
| account → communication | OHS+PL: communication publishes `src/communication/1.0/contract/`; account's adapter in `src/account/1.0/infrastructure/` implements account's own port against it | `src/communication/1.0/contract/`, the only surface account may import | sync; account's domain and application never see communication, they depend on the consumer port `VerificationMessageSender` (`src/account/1.0/domain/`, account spec §3.5, §4.3, §4.4). Not wired yet: no adapter is bound today |
| communication → email provider, WhatsApp (Chatwoot) | ACL | communication's own ports | external contexts; their payloads never cross into the domain |

## 3. Template→instance seams (snapshot at creation)

None today.

| Template (owner) | Instance (owner) | Snapshotted at |
|---|---|---|

## 4. Shared kernels

Expected: none. An entry here is a declared liability. Each one requires: a name under
`src/sharedKernel/<name>/`, an owner-of-record, an explicit consumer allowlist, and a
matching `shared-kernel-<name>-allowlist` rule in `.dependency-cruiser.cjs`.

| Kernel | Owner-of-record | Allowed consumers | Why it cannot live in a context |
|---|---|---|---|

## 5. Extraction triggers (all extraction starts here)

Extract a context only when at least one holds — and record which one:

- independent scaling need proven by load, not anticipated
- deploy cadence conflict (the context needs to ship on its own clock)
- team/ownership boundary
- different runtime or SLA requirements
- the context dominates pipeline time (tests + mutation)

## 6. Extraction procedure

1. Characterization tests pin the context's live observable behavior.
2. Consumer-driven contract tests derive from the context's spec §3 (Contract).
3. Consumers already depend on their own ports; swap the in-process adapter for a
   transport adapter (HTTP/queue) in each consumer's `dependencyContainerModule.ts`.
   Domain and application code change zero lines.
4. Move the context to a separate deployable INSIDE the monorepo first (npm
   workspaces) — independent deploys while dependency-cruiser still sees everything.
   A separate repository only when something forces it; that is the moment contract
   tests replace depcruise as the boundary enforcement.
5. Preconditions checked: per-module config exists (no god Config), `@core` consumed as a
   versioned package (not a copied folder).
