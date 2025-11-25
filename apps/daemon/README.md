# apps/daemon

Daemon/worker process for long-running tasks (game loop, markets engine, NPCs, cron/queues).

- Runs background loops and workers; no HTTP surface by default.
- Calls `@babylon/core-*` use-cases directly using `@babylon/shared-infra` for DB/Redis/logging.
