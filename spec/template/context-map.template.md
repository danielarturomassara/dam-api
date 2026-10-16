# Context Map — <project>

> Authored and edited by Daniel only. Agents: read this before touching ANY cross-context
> seam. The filled map lives at the project root as `context-map.md`, protected like
> `CLAUDE.md`, which imports it into every session.

## 1. Contexts

| Context | Responsibility (one line) | Owned data | Language notes |
|---|---|---|---|
| <name> | <what it is accountable for> | <tables/collections/graphs it owns> | <terms that mean something specific here> |

## 2. Edges

Default patterns: Open Host Service + Published Language (`contract/`) between internal
contexts; Anti-Corruption Layer toward anything external or unstable (third-party APIs
count as external contexts).

| From → To | Pattern | Surface | Notes |
|---|---|---|---|
| <consumer> → <provider> | OHS+PL / ACL | `src/<provider>/1.0/contract/` or `<port name>` | <sync/async, events, snapshot?> |

## 3. Template→instance seams (snapshot at creation)

| Template (owner) | Instance (owner) | Snapshotted at |
|---|---|---|
| <e.g. course (catalog)> | <e.g. edition (delivery)> | <edition creation> |

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
