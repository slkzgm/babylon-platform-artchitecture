# @babylon/shared-infra

Cross-cutting infrastructure: Drizzle, Redis, logger, config, resilience.

- No domain logic; consumed by core domain packages.
- Wraps primitives from @babylon/db and exposes higher-level infra helpers.
