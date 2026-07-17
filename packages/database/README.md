# `@rishi/database`

Database connection initialization, connection pooling, and ORM setups using Drizzle ORM.

## Responsibilities

- Houses Drizzle client instantiation, connection pool helper, database validation, and migrations configurations.
- **Must never own:** Table schemas, migrations scripts (except within raw configs), query repositories, or entity seeders during the initialization phase.

## Dependencies

- **Allowed Dependencies:** `@rishi/transaction`, `@rishi/logger`, `@rishi/config`, `@rishi/domain`, `@rishi/shared`
- **Forbidden Dependencies:** Client views (`apps/client`), routing servers (`apps/server`), or prompt assembly engines.

## Public API

Exposes the database connection pool bootstrap helper (`createDatabaseClient`) and standard types.
