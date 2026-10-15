# <Module> Specification

> Authored and edited by Daniel only. Agents: read-only. Implementation conforms to this
> document; when they disagree, this document wins.

## 1. Purpose

<What the module does, in two or three sentences.>

## 2. Scope

Defines: <contract, behavior rules, errors>. Does not define: <explicit non-goals>.

## 3. Contract

<HTTP endpoints or use-case signatures. Method, path, request shape, response shape,
success codes.>

## 4. Behavior

<Numbered "shall" rules. One observable behavior per rule.>

- 4.1 The module shall ...
- 4.2 When <condition>, the module shall ...

## 5. Errors

<Domain error per failure condition, mapped from @core: InvalidArgument, Conflict,
NotFound, Unauthorized, Forbidden, ServerError.>

## 6. Non-goals

<What the current implementation is explicitly not required to support.>

## 7. Conformance

An implementation conforms if it satisfies sections 3-5 and passes the gauntlet.
