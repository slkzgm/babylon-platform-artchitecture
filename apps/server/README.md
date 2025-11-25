# apps/server

Elysia API host for Babylon.

## Role
- Serve all HTTP routes (and later SSE/WS) for clients.
- Wire request context (user/session, db, redis, logger) into core use-cases via `@babylon/api`.
- Map domain errors to HTTP responses; no business logic here.

## Dev tips
- Add domain routes in `packages/api` and mount them here.
- Keep handlers thin: validate → call `@babylon/core-*` use-cases → return typed result.
