# @babylon/config

Shared TypeScript/TSConfig base settings for the monorepo.

## Role
- Provide a single `tsconfig.base.json` used by all apps and packages.
- Keep TypeScript options consistent across the workspace.

## Notes
- Do not put runtime configuration (env vars) here; keep that in code within `shared-infra`.\n*** End Patch ***!
