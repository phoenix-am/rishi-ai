# Rishi AI

Content Production Operating System for research-intensive creators.

## Overview

Rishi AI is a modular monolith designed to preserve creative context across the entire scriptwriting, research, and media production lifecycle.

## Architectural Dependency Boundaries

```text
                 @rishi/shared (Zero dependencies)
                      ▲
                      │
               @rishi/domain (Depends only on shared)
                      ▲
                      │
               @rishi/events (Depends only on domain)


 @rishi/config (Zero dependencies) ─────► @rishi/logger
                                               ▲
                                               │
                                       @rishi/transaction
                                               ▲
                                               │
                                        @rishi/database


apps/server (Depends on: config, logger, database, events, domain)

apps/client (Depends on: domain)
```

## Workspace Structure

- **`apps/`**: Applications (`client` React web app, `server` NestJS REST server).
- **`packages/`**: Monolith subsystems (`shared`, `domain`, `events`, `auth`, `config`, `logger`, `transaction`, `database`, `testing`).
- **`configs/`**: Reusable configurations (ESLint, Prettier, TypeScript, Vitest, commitlint).
- **`docs/`**: Governance documents and Architecture Decision Records (ADRs).
- **`docker/`**: Local PostgreSQL 16 + pgvector container configs.

## Prerequisites

- **Node.js**: `^22.0.0` (Locked in `.nvmrc`)
- **pnpm**: `^10.0.0` (Locked in `package.json`)
- **Docker**: For running the local database instance.

## Quick Start

1. **Bootstrap Workspace**:
   Install dependencies and build TypeScript packages:

   ```bash
   pnpm bootstrap
   ```

2. **Spin Up Local Database**:
   Starts PostgreSQL with pgvector:

   ```bash
   pnpm run db:up
   ```

3. **Start Development Servers**:
   Launch backend and frontend concurrent dev runners:
   ```bash
   pnpm dev
   ```

## Development Commands

| Command              | Action                                                         |
| :------------------- | :------------------------------------------------------------- |
| `pnpm run build`     | Compiles all packages and apps in topological order            |
| `pnpm run dev`       | Spins up backend and frontend development servers concurrently |
| `pnpm run typecheck` | Validates TypeScript compilation across all packages           |
| `pnpm run lint`      | Runs ESLint and validates package boundaries                   |
| `pnpm run format`    | Standardizes codebase spacing and style using Prettier         |
| `pnpm run test`      | Executes Vitest unit tests                                     |
| `pnpm doctor`        | Runs repository diagnostic audits                              |

## Phase 2 Boundaries & Deferrals

Phase 2 focuses strictly on laying down the core technical foundation and infrastructure packages. To preserve scope isolation, full application-level wiring has been intentionally deferred to subsequent implementation phases and is not part of the Phase 2 acceptance criteria. This includes:

- NestJS dependency injection integration for `DatabaseService` and `TransactionManager` inside `apps/server`.
- Global middleware setup for HTTP request correlation IDs.
- Transaction interceptors or decorators for automatic business flow transaction boundaries.
- Dedicated health check endpoints (e.g. mapping `DatabaseService.ping()`).
- Implementation of domain-specific database schemas, migrations, or authentication token services.

## Monorepo Governance

Review [MONOREPO_GUIDE.md](MONOREPO_GUIDE.md) and [CONTRIBUTING.md](CONTRIBUTING.md) before writing code or adding packages.
