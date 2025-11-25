# @babylon/api

API layer built on Elysia.

- Defines routes per domain (identity, social, markets, etc.).
- Creates request context (user/db/redis/logger) and calls `@babylon/core-*` use-cases.
- Performs input validation (Zod) and maps domain errors to HTTP responses.
