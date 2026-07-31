# `@rishi/database`

Database connection initialization, connection pooling, and ORM setups using Drizzle ORM.

| Metadata                  | Value                                                               |
| :------------------------ | :------------------------------------------------------------------ |
| **Lifecycle**             | Reference                                                           |
| **Implementation Status** | Implemented TDD-004 persistence foundation                          |
| **Current Authority**     | Package source and public API                                       |
| **Review Status**         | Aligned with the current package source, migrations, and public API |
| **Last Verified**         | 2026-07-31                                                          |

## Responsibilities

- Owns lazy Drizzle/PostgreSQL client initialization, connection health, explicit migration execution, table schemas, persistence mappers, and repository adapters.
- Integrates active `@rishi/transaction` contexts without opening a database connection during package import.
- Does not own application workflows, storage providers, parsing, queue execution, or AI orchestration.

## Dependencies

- **Allowed Dependencies:** `@rishi/transaction`, `@rishi/logger`, `@rishi/config`, `@rishi/domain`, `@rishi/shared`
- **Forbidden Dependencies:** Client views (`apps/client`), routing servers (`apps/server`), or prompt assembly engines.

## Public API

Exposes `createDatabaseClient`, `DatabaseService`, `runDatabaseMigrations`, schema objects and relations, persistence mappers, and repository adapters through the package root.

Run pending migrations explicitly from the repository root:

```bash
pnpm db:migrate
```
