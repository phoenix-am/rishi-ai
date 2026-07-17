# Contributing to Rishi AI

Thank you for contributing to Rishi AI! To maintain quality, type safety, and clean boundaries across our codebase, please follow the guidelines below.

## Monorepo Rules & Architecture

This repository is structured as a modular monolith using a `pnpm` workspace:

- **`apps/`**: Applications (`client`, `server`).
- **`packages/`**: Decoupled, single-responsibility shared packages.

### Package Boundaries

We enforce strict acyclic dependency structures. Refer to `MONOREPO_GUIDE.md` for the exact dependency hierarchy.

- **Never** bypass public APIs. All cross-package imports must use standard namespace aliases (e.g. `@rishi/database`) rather than importing internal file paths (e.g., `@rishi/database/src/internal/...`).
- **Never** import apps into packages.
- **Never** introduce circular dependencies.

## Local Development Workflow

1. **Prerequisites**: Ensure you have Node.js 22 and pnpm 10 installed.
2. **Setup**: Run `pnpm bootstrap` to install dependencies and initialize the workspace.
3. **Database**: Spin up the local database container using `pnpm db:up`.
4. **Development**: Start client and server in development mode concurrently using `pnpm dev`.
5. **Validation**: Run `pnpm doctor` locally before committing to check for dependency cycles, type errors, or formatting anomalies.

## Commit Guidelines

We use conventional commit messages. Your commit messages must follow the format:

```text
<type>(<scope>): <short description>
```

Valid types include `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
Examples:

- `feat(projects): add outline approved event stream`
- `fix(database): correct pgvector connection pool parameters`
