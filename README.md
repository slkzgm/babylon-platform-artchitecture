# Babylon V2 (scaffold)

Modular monolith scaffold: Bun + Elysia (Eden client) for the API, Next.js for the web UI, Drizzle/Postgres for data, Turborepo for the monorepo. Core business logic will live in `packages/core-*`; apps only do wiring/UI.

## Stack
- Runtime/tooling: Bun (use Bun commands/APIs), Turborepo, Biome, Husky
- Backend: Elysia (`apps/server`) + Eden client for typed HTTP
- Frontend: Next.js 16 (`apps/web`)
- Data: PostgreSQL (Neon) + Drizzle ORM
- Styling: Tailwind v4 + shadcn/ui primitives

## Quick start
```bash
bun install

# DB (set DATABASE_URL in root .env)
bun run db:generate   # drizzle-kit generate
bun run db:migrate    # drizzle-kit migrate

# Dev
bun run dev         # server:3000, web:3001
# or separately
bun run dev:server
bun run dev:web
```

## Environment
- Use a single root `.env` (see `.env.example`) for all apps/packages.
- Document new vars in `.env.example` with comments, defaults, and optional/required notes.
- Avoid scattering per-app env files unless you have an explicit override need.

## Scripts
- `bun run dev` / `dev:server` / `dev:web` — start apps
- `bun run build` — build all
- `bun run check-types` — type check via turbo
- `bun run check` — Biome format/lint (pre-commit)
- `bun run db:generate` / `db:migrate` — Drizzle (see `packages/db/drizzle.config.ts`)

## Structure (current)
```
apps/
  server/  # Elysia API host (no business logic)
  web/     # Next.js UI (consumes API)
  daemon/  # Background loops/workers (game/markets/NPCs)
  agents/  # Agent runners/integrations
packages/
  api/                # Elysia routes (imported by server) and API types
  db/                 # Drizzle schema/client
  core/               # Domain logic (framework-free)
    identity/         # Auth/accounts/onboarding/registry
    social/           # Posts/comments/chats/notifications/trending
    markets/          # Markets/pools/perps/wallet accounting
    game/             # Game world/NPCs/simulation
    reputation/       # Reputation/points/rewards/leaderboards
    agents/           # Agent abstractions/strategies
    contracts/        # Contract bindings
  shared/             # Cross-cutting
    infra/            # Drizzle/Redis/logger/config/resilience
    utils/            # Generic helpers/types/Zod
    ui/               # Design primitives
docs/
  project-architecture-overview.md  # Architecture proposal and boundaries
```

## Conventions
- Apps never contain domain logic; implement in `core-*`, expose via `packages/api`, consume in `apps/web`.
- Core packages are framework-free (no Next/React/Elysia).
- 2-space indent, PascalCase components, camelCase hooks/vars, kebab-case packages.
- Tests: unit in `core-*`, integration in `apps/server` for routes; place next to code (`*.test.ts` / `*.spec.ts`).

## References
- Architecture: `docs/project-architecture-overview.md`
- App roles: `apps/server/README.md`, `apps/web/README.md`
- Package responsibilities: `packages/*/README.md`
