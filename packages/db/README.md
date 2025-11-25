# @babylon/db

Drizzle schema and database tooling.

## Role
- Hold the Drizzle schema and migrations configuration.
- Expose the Drizzle client for `@babylon/shared-infra`.
- Provide DB scripts (`db:generate`, `db:migrate`, etc.) via root package scripts.

## Notes
- No domain logic; only schema and low-level DB access.
- Schema changes should be coordinated with the owning domain packages.
