# `@rishi/testing`

Shared test configurations, runner wrappers, and custom Vitest assertions for Rishi AI.

## Responsibilities

- Houses test runner setups, custom assertions, mock utilities, and path alias resolvers.
- **Must never own:** Fake database connections, mock repositories, mock business data, or domain fixtures during the initialization phase.

## Dependencies

- **Allowed Dependencies:** `vitest` (third party).
- **Forbidden Dependencies:** Workspace modules (`@rishi/*`).

## Public API

Provides standard test assertions and environment configuration helpers.
