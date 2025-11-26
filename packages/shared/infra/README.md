# @babylon/shared-infra

Cross-cutting infrastructure: Drizzle, Redis, logger, config, resilience.

## Responsibilities

- No business logic
- No domain-specific rules
- Only infrastructure-level utilities
- Safe to import from any package

## Notes

- Wraps primitives from @babylon/db and exposes higher-level infra helpers.
- Consumed by core domain packages.
