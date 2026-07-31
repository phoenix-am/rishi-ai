# Local Development Docker Infrastructure

Provides local zero-cost PostgreSQL 16 + pgvector database instances.

| Metadata               | Value                                                                |
| :--------------------- | :------------------------------------------------------------------- |
| **Lifecycle**          | Reference                                                            |
| **Operational Status** | Local database only; no verified production migration command exists |
| **Current Authority**  | `docker-compose.yml`, Docker configuration, and root package scripts |
| **Last Verified**      | 2026-07-31                                                           |

## Service Stack

- **Database Engine:** PostgreSQL 16 via the official `pgvector/pgvector:pg16` image.
- **Extensions:** Installs `pgvector` automatically using the init script (`init.sql`).
- **Volume:** Named Docker volume `rishi_postgres_data` mapping to `/var/lib/postgresql/data`.

## Commands

Start database container:

```bash
pnpm run db:up
```

Stop database container:

```bash
pnpm run db:down
```
