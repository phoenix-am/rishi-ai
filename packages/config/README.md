# `@rishi/config`

Validates, parses, and loads process environment parameters dynamically at system bootstrap.

## Responsibilities

- Define environment schemas using Zod validation.
- Provide `ConfigService` wrapping parsed parameters.
- **Must never own:** Secret keys, database connection strings (except as validated values), API credentials, business configuration parameters, or feature flags.

## Dependencies

- **Allowed Dependencies:** `zod` (third party only, zero workspace dependencies).
- **Forbidden Dependencies:** All other packages (`@rishi/*`).

## Public API

Exposes the Zod validator (`envSchema`), configuration types (`EnvConfig`), validation exception models, and the `ConfigService` loader.
