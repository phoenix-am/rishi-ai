# Contributing to Rishi AI

This guide is the single development workflow and tooling reference for the Rishi AI monorepo.

## Before Starting

1. Read [DOCUMENT_AUTHORITY.md](.docs/DOCUMENT_AUTHORITY.md).
2. Read [CURRENT_STATE.md](.docs/CURRENT_STATE.md).
3. Confirm the approved task scope, exclusions, and acceptance criteria.
4. Read only the applicable PRD, ADR, architecture, TDD, package, and application documentation listed in [DOCUMENT_INDEX.md](.docs/DOCUMENT_INDEX.md).
5. Inspect the current worktree and preserve unrelated changes.

Documentation never authorizes staging, committing, pushing, publishing, deploying, or contacting external systems. Those actions require explicit task authorization.

## Workspace Topology

```text
apps/
  client/       React and Vite browser application
  server/       NestJS and Fastify server application
packages/
  shared/       Dependency-free shared utilities
  domain/       Domain entities, contracts, events, and value objects
  events/       Shared event contracts
  auth/         Authentication and session contracts
  config/       Environment validation and configuration access
  logger/       Structured logging abstraction
  transaction/  Async transaction-context propagation
  database/     Drizzle schemas, migrations, mappers, and repositories
  testing/      Shared testing helpers
configs/        Shared repository tooling configuration
```

## Package Boundaries

- Import workspace packages through their public `@rishi/*` API. Never import sibling package internals.
- Packages must never import from `apps/*`.
- `@rishi/shared` remains free of internal workspace dependencies.
- `@rishi/domain` remains framework- and persistence-independent and may depend only on `@rishi/shared`.
- Preserve the dependency rules enforced in `configs/eslint/eslint.config.js`.
- Do not introduce circular dependencies.

When adding an approved package:

1. Create it under `packages/` with a private `@rishi/*` package name.
2. Add its TypeScript configuration and root project reference.
3. Export a deliberate public API from `src/index.ts`.
4. Register its boundary rules in the ESLint configuration.
5. Add a concise README describing its responsibility, public API, and allowed dependencies.

Adding a package or changing package responsibility may require an ADR under [CHANGE_POLICY.md](.docs/CHANGE_POLICY.md).

## Local Workflow

```bash
pnpm install --frozen-lockfile
pnpm run db:up
pnpm run build
pnpm run dev
```

TypeScript workspace packages expose generated declarations, so build before repository-wide type checking in a clean workspace.

## Tooling

- ESLint enforces code quality and package boundaries through `configs/eslint/eslint.config.js`.
- Prettier rules are defined in `configs/prettier/prettier.config.js`.
- TypeScript base, Node, and browser configurations live under `configs/typescript/`.
- Vitest defaults are defined in `configs/vitest/vitest.config.ts`; individual projects may extend them.
- Husky runs `lint-staged` before commits and commitlint for commit messages.
- Commitlint configuration lives in `configs/commitlint/commitlint.config.js`.

Configuration source files are authoritative when this summary becomes stale.

## Validation

Use the task contract to determine applicable checks. The repository-wide baseline is:

```bash
pnpm install --frozen-lockfile
pnpm run doctor
pnpm format:check
pnpm lint
pnpm build
pnpm typecheck
pnpm test
pnpm audit --prod --audit-level high
git diff --check
```

Never report a check as passing unless it was executed. Report failures, warnings, skipped checks, and whether they predate the task.

## Documentation

- Update current-state claims only from repository evidence after applicable validation.
- Update affected public or package documentation when behavior, commands, responsibilities, or public APIs change.
- Preserve historical documents and frozen design bodies according to [CHANGE_POLICY.md](.docs/CHANGE_POLICY.md).
- Planning and `IMPLEMENTATION READY` labels are not evidence that behavior exists.

## Commits

When a commit is explicitly authorized, use Conventional Commits:

```text
<type>(<scope>): <short description>
```

Allowed types are defined by commitlint and currently include `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, and `chore`.
