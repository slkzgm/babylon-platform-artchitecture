# Babylon V2 Architecture Overview (Proposal)

This document describes a proposed V2 architecture for Babylon as a **modular monolith** inside a Bun-based monorepo, with:

- A dedicated **API backend** built with Elysia (`apps/server`).
- A **Next.js web app** focused purely on UI (`apps/web`).
- A **daemon** for long‑running jobs (game loop, markets, NPCs) (`apps/daemon`, to add).
- **Agents/CLI** apps for autonomous strategies (`apps/agents`, to add).
- A set of **core domain packages** that encapsulate business logic and infrastructure.

Primary goals:
- Clear **domain boundaries** and ownership.
- Reusable, framework‑agnostic **core logic**.
- Clean separation between **web UI**, **API backend**, and **runtime/daemon**.
- Easier onboarding, maintenance, and scaling of both **product** and **team**.

---

## 1. Monorepo Layout

We structure the repo around two main concepts:

- `apps/*` → entrypoints / runtime processes (API, web, daemon, agents).
- `packages/*` → reusable libraries (core domains + shared utilities).

### 1.1. Apps

- `apps/server`
  - Elysia/Bun backend host.
  - Serves HTTP (and later SSE/WS).
  - Handles auth, authorization, input validation, error mapping.
  - Delegates all domain work to `@babylon/core-*` packages via `@babylon/api`.

- `apps/web`
  - Next.js app focused solely on UI and UX.
  - Uses `apps/server` as its backend (HTTP calls from server and client).
  - Contains pages, layouts, React components, and data hooks.
  - No direct DB/Redis access and no domain logic beyond mild presentation.

- `apps/daemon` (to add)
  - Long‑running processes (game loop, markets engine, NPCs, cron/queues).
  - Talks directly to `@babylon/core-*` and `@babylon/shared-infra`.
  - May expose internal health endpoints, but is not a public API.

- `apps/agents` (to add)
  - Runners for Eliza/agent0 and other agents.
  - Consume `apps/server` via HTTP/SSE/WS.
  - Optionally use shared libraries from `@babylon/core-agents` and `@babylon/shared-*`.

> Rule: **Apps never contain new domain logic**. They only wire HTTP, jobs, and UI onto the core packages.

### 1.2. Packages

Core domain packages (business logic):

- `@babylon/core-identity`
  - Auth, accounts, wallets, registry, onboarding.

- `@babylon/core-social`
  - Posts, comments, feeds, chats, notifications, trending, growth features.

- `@babylon/core-markets`
  - Markets, pools, positions, perps engine, pricing, wallet accounting.

- `@babylon/core-game`
  - Game world, NPCs, simulations, game events, integration with markets.

- `@babylon/core-reputation`
  - Reputation, points, rewards, leaderboards, PnL normalization.

- `@babylon/core-agents`
  - Agent models and strategies, abstractions for trading and interactions with Babylon.

- `@babylon/core-contracts`
  - TypeScript bindings for Solidity contracts (ABIs, addresses, helper functions).

Shared technical packages:

- `@babylon/api`
  - Elysia routes/types used by `apps/server` and Eden clients.
  - No business logic; only wiring + validation.

- `@babylon/shared-infra`
  - Drizzle client and repositories.
  - Redis client, caching utilities.
  - Logging, configuration, resilience (retry/circuit breaker).

- `@babylon/shared-ui`
  - Design system components, primitive UI building blocks, common hooks.

- `@babylon/shared-utils`
  - Cross‑domain utilities, generic types, Zod schemas, helpers.

> Rule: **Core packages are framework‑agnostic**. They do not import Next, React, or Elysia.

---

## 2. Domain Responsibilities

The heart of the architecture is a clear mapping of “what belongs where”.

### 2.1. Identity & Accounts (`@babylon/core-identity`)

Responsibilities:
- User identity lifecycle (Privy / Farcaster / wallets), registry on/off-chain.
- Onboarding flow (intents, profile application, on‑chain registration orchestration).
- User/session resolution (canonical IDs for DB/auth/agents).

Provides:
- Use‑cases: `signIn`, `signOut`, `getCurrentUser`, `startOnboardingIntent`, `applyOnboardingProfile`, `startOnchainRegistration`, `linkWallet`, `linkFarcasterAccount`.
- Domain entities/services: `User`, `Wallet`, `OnboardingIntent`, `RegistryEntry`.

Does **not** handle: feed/posts/chats, markets/trading, reputation scores.

### 2.2. Social & Messaging (`@babylon/core-social`)

Responsibilities:
- Social graph and content (posts, comments, replies, actors/organizations).
- Communication (DMs, group chats).
- Engagement (notifications, trending tags, social-driven waitlist/referrals).

Provides:
- Use‑cases: `createPost`, `editPost`, `deletePost`, `createComment`, `replyToComment`, `followActor`, `unfollowActor`, `sendMessage`, `createChat`, `joinChat`, `notifyUser`, `computeTrendingTopics`.

Depends on: `@babylon/core-identity` for users/actors, `@babylon/shared-infra` for DB/cache/SSE/WS.

Does **not**: modify wallets/positions directly or compute reputation (may emit events that Reputation consumes).

### 2.3. Markets & Trading (`@babylon/core-markets`)

Responsibilities:
- Market/pool definitions (prediction markets, perps).
- Perpetuals engine (price impact, PnL, liquidations).
- Wallet accounting linked to trades.
- Price ingestion/propagation (oracles, game, external sources).

Provides:
- Use‑cases: `openPerpPosition`, `closePerpPosition`, `getUserPositions`, `getMarketState`, `processPriceUpdate`, `createPool`, `deposit`, `withdraw`.
- Domain entities: `Market`, `Pool`, `Position`, `WalletBalance`, `PriceTick`.

Depends on: `@babylon/core-identity` for ownership, `@babylon/core-contracts` if on‑chain, `@babylon/shared-infra` for DB/cache/SSE/WS.

Does **not**: decide feed content or own game world logic.

### 2.4. Game & Simulation (`@babylon/core-game`)

Responsibilities:
- Game world state/entities (NPCs, scenarios, events).
- Game loop/ticks and simulations.
- NPC actions and interactions with markets/social layers.

Provides:
- Use‑cases: `tickGameWorld`, `spawnNPC`, `configureNPCStrategy`, `scheduleGameEvent`, `processEvent`.
- Interfaces to emit price updates to Markets or social events to Social.

Depends on: `@babylon/core-identity` (players/NPC owners), `@babylon/core-markets` (trade/price hooks), `@babylon/shared-infra` (DB/metrics).

### 2.5. Reputation & Rewards (`@babylon/core-reputation`)

Responsibilities:
- Reputation scoring based on interactions/performance.
- Rewards mechanics (points, tickets, rewards distribution).
- Leaderboards across reputation/performance dimensions.

Provides:
- Use‑cases: `updateReputationFromEvent`, `getReputationBreakdown`, `awardPoints`, `redeemReward`, `getLeaderboard`.

Depends on: `@babylon/core-identity` (user mapping), `@babylon/shared-infra` (persistence/analytics). Consumes events from Markets/Social/Game.

### 2.6. Agents & Integrations (`@babylon/core-agents`)

Responsibilities:
- Abstractions for agents interacting with Babylon (read/write to markets/social/game).
- Strategy/policy helpers.

Provides:
- SDK-like services: `getAgentMarketView`, `submitAgentOrder`, `postAgentComment`.
- Shared logic for `apps/agents` runners and `plugin-babylon`-like integrations.

Depends on: `@babylon/core-markets`, `core-social`, `core-identity` via clear interfaces; `@babylon/shared-utils` for types/validation.

### 2.7. Contracts (`@babylon/core-contracts`)

Responsibilities:
- Type-safe access to Solidity contracts (ABIs, addresses).
- Helper functions for on‑chain calls/transactions.

Provides: `registerOnchainIdentity`, `submitOnchainTrade` (if needed), `readOnchainReputation`.

Depends on: viem/ethers or similar libraries (thin wrapper only).

---

## 3. Internal Layering (Inside Each Core Package)

Each `@babylon/core-*` package follows a consistent pattern:
- `domain/` — entities, value objects, domain events (no DB/HTTP knowledge).
- `application/` — use‑cases orchestrating domain logic, transaction boundaries.
- `infrastructure/` — adapters (Drizzle/Redis/external APIs) used by the application layer.
- `api-models/` (optional) — DTOs/Zod schemas for request/response shapes consumed by `apps/server` via `@babylon/api`.

> Rule: `application` depends on `domain`; `infrastructure` depends on both. `apps/*` only call `application` APIs.

---

## 4. API Backend (Elysia + Eden clients)

`apps/server` is the single HTTP gateway. `@babylon/api` hosts Elysia routes/types.

Module structure (example):
- `apps/server/src/index.ts` — Elysia setup + route registration.
- `@babylon/api/src/*` — routes/types per domain (`identity`, `social`, `markets`, etc.).

Request context: built once per request with user (if any), Drizzle, Redis, logger; passed into core use‑cases: `await openPerpPosition({ user, db, redis, logger }, input)`.

Errors & validation: inputs validated with Zod; domain errors mapped to HTTP status codes in the API layer only (`NotFound` → 404, `Conflict` → 409, `Validation` → 422, `Unauthorized` → 401).

> Core packages never depend on HTTP. They express failures in domain terms; only the API layer decides HTTP status codes.

---

## 5. Web App (Next.js) Responsibilities

`apps/web` is a pure consumer of `apps/server`.

What lives in `apps/web`:
- Pages, layouts, React components.
- View-level hooks/state (Zustand/contexts) and an `apiClient` typed with Zod/TypeScript that wraps calls to `apps/server`.

What does **not** live in `apps/web`:
- Direct DB/Redis access.
- Domain logic or cross-domain orchestration (those stay in `core-*` and `apps/server`).

> When adding a feature: design/implement the core use‑case → expose an API endpoint → build UI.

---

## 6. Daemon & Runtime Processes

`apps/daemon` (later) hosts long‑running processes:
- Game loop ticks, markets engine updates, NPC strategies, cron/queues.
- Uses `@babylon/shared-infra` for DB/Redis/logging.
- Calls into `@babylon/core-*` application services directly.

The daemon does not duplicate API logic; it uses the same core packages as `apps/server`.

---

## 7. Dependencies & Boundaries

- `apps/*` may depend on `@babylon/core-*`, `@babylon/shared-*`.
- `@babylon/core-*` may depend on `@babylon/shared-infra` and `@babylon/shared-utils` (avoid circular domain deps; use interfaces/events).
- `@babylon/shared-*` must never depend on `@babylon/core-*`.

Dependencies flow **outwards to inwards** (apps → core → shared), never the other way.

---

## 8. Coding Practices & Team Workflow

Ownership by domain (examples):
- `core-identity` & `shared-infra` → Identity/Platform owner.
- `core-markets` & `core-game` → Markets/Game owner.
- `core-social` & `core-reputation` → Social/Reputation owner.
- `core-agents` & `core-contracts` → Agents/Protocol owner.
- `shared-ui` & `apps/web` → Frontend/UX owner.

Feature workflow:
1. **Domain first**: add/extend use‑cases in the relevant `core-*` package.
2. **API**: expose via `@babylon/api` Elysia routes in `apps/server` (validation + error mapping).
3. **Web/Clients**: consume via `apps/web` (or `apps/agents`) using the typed Eden client.
4. **Tests**: unit tests in `core-*`; integration tests in `apps/server`; UI/e2e where needed.

Documentation & conventions:
- Each `core-*` package gets a short README with responsibilities/invariants.
- Naming: components `PascalCase`, hooks/vars/functions `camelCase`, packages/domains `core-identity`, `core-markets`, etc.
- API contracts: Zod schemas for request/response models; export types from `api-models` to keep frontend/backend aligned.

---

## 9. Testing & Observability

Testing strategy:
- **Unit tests** inside each `core-*` package for domain rules.
- **Integration tests** in `apps/server` for key routes/flows (auth, trading, onboarding, reputation updates).
- **E2E tests** (Playwright or similar) for critical user journeys (signup, trading, social interactions).

Observability:
- Central logging via `@babylon/shared-infra` (request ID, user ID).
- Metrics per domain (onboarding, trades, game ticks, agent actions).
- Optional tracing: spans from `apps/server` → `core-*` → DB/Redis.

---

## 10. Summary

This architecture turns Babylon into a **modular monolith** with:
- Clear separation between **apps** (server, web, daemon, agents) and **packages** (core domains + shared).
- Strongly defined **domain packages** that own business logic.
- A dedicated **Elysia backend** acting as the single HTTP surface (consumed via Eden clients).
- A **Next.js web app** focused purely on UI.

Strict boundaries, explicit domain ownership, and consistent layering make the system easier to evolve, safer to scale, and friendlier to onboard new developers.

---

## Ownership & Reviews (Recommended)

Own by domain, not by app:
- Domain owners (or pairs) for each `packages/core/*`: identity, social, markets, reputation, game, agents, contracts. They guard invariants across all entrypoints (API/server, web, daemon, agents).
- Shared stewards for `packages/shared/*` (infra/utils/ui) and `packages/api` (Elysia wiring) to keep patterns consistent; they’re not gatekeepers beyond invariants.
- `packages/db`: schema steward; schema changes require the relevant domain owner.

Apps ownership:
- `apps/server`: platform/infra steward + domain owner for domain-affecting changes.
- `apps/web`: frontend/UX steward; domain owner signs off if domain contract/flow changes.
- `apps/daemon`: platform + impacted domain (markets/game/etc.).
- `apps/agents`: agents steward + impacted domains.

Review rules:
- Changes to domain use-cases/entities: domain owner review required, regardless of app touched.
- Cross-cutting changes (`shared/*`, `api`): steward review.
- UI-only tweaks: frontend steward unless domain contracts change.
