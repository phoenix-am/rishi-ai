# Rishi AI

Rishi AI is a Content Production Operating System for research-intensive creators. It preserves project context and structured production state across research, knowledge organization, writing, review, and delivery workflows.

The repository is a private TypeScript modular monolith. Repository evidence, not roadmap language, determines what is currently implemented.

## Current State

- `apps/server`: NestJS 11 application using Fastify. It includes authentication, workspace authorization, creator, project, content-asset, workflow, AI-adapter, streaming, and platform-foundation modules. The complete customer workflow is not yet connected.
- `apps/client`: React 19 and Vite application. It currently provides a buildable static shell rather than a usable production interface.
- `packages/`: Shared domain and infrastructure packages for configuration, logging, transactions, persistence, contracts, events, and testing.
- `docker/`: Local PostgreSQL 16 and pgvector infrastructure.

See [CURRENT_STATE.md](.docs/CURRENT_STATE.md) for the last verified implementation snapshot and [DOCUMENT_INDEX.md](.docs/DOCUMENT_INDEX.md) for documentation navigation.

## Prerequisites

- Node.js 22
- pnpm 10
- Docker for the local PostgreSQL service

## Setup

```bash
pnpm install --frozen-lockfile
pnpm run db:up
pnpm run build
pnpm run dev
```

Environment variables are documented with safe placeholders in `.env.example`.

## Validation

```bash
pnpm run doctor
pnpm format:check
pnpm lint
pnpm build
pnpm typecheck
pnpm test
pnpm audit --prod --audit-level high
```

Run only the checks applicable to a task while working, and run the complete required validation contract before declaring that task complete.

## Repository Layout

```text
apps/       Executable client and server applications
packages/   Public workspace packages
configs/    Shared TypeScript, lint, format, test, and commit configuration
.docs/      Product, architecture, design, governance, status, and history
docker/     Local database infrastructure
scripts/    Workspace setup, cleanup, and repository diagnostics
```

## Engineering Guidance

Before changing implementation:

1. Read [DOCUMENT_AUTHORITY.md](.docs/DOCUMENT_AUTHORITY.md).
2. Read [CURRENT_STATE.md](.docs/CURRENT_STATE.md).
3. Follow the approved task contract.
4. Read the applicable PRD, ADRs, architecture references, and TDDs through [DOCUMENT_INDEX.md](.docs/DOCUMENT_INDEX.md).
5. Follow [CONTRIBUTING.md](CONTRIBUTING.md) and the [Engineering Rulebook](.docs/engineering/ENGINEERING_RULEBOOK.md).

Cross-package imports must use public package APIs. Packages must not import applications, and circular dependencies are prohibited.
