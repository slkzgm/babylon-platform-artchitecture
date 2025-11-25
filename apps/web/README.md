# apps/web

Next.js web UI for Babylon.

## Role
- UI/UX only: pages, layouts, components, and data hooks.
- Consumes `apps/server` via typed API clients; no direct DB/Redis.

## Dev tips
- For new features: implement in `packages/core/*`, expose via `packages/api`, then wire UI here.
- Use `@babylon/shared-ui` for design system primitives and `@babylon/shared-utils` for generic helpers.
