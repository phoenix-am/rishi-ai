# `@rishi/testing`

Shared test configurations, runner wrappers, and custom Vitest assertions for Rishi AI.

| Metadata                  | Value                                              |
| :------------------------ | :------------------------------------------------- |
| **Lifecycle**             | Reference                                          |
| **Implementation Status** | Partially Implemented — minimal shared helper only |
| **Current Authority**     | Package source and public API                      |
| **Last Verified**         | 2026-07-31                                         |

## Responsibilities

- Houses test runner setups, custom assertions, mock utilities, and path alias resolvers.
- **Must never own:** Fake database connections, mock repositories, mock business data, or domain fixtures during the initialization phase.

## Dependencies

- **Allowed Dependencies:** `vitest` (third party).
- **Forbidden Dependencies:** Workspace modules (`@rishi/*`).

## Public API

Provides standard test assertions and environment configuration helpers.
