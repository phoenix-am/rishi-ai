# ESLint Configuration

This configuration houses the central rules for linting and enforcing architectural boundaries across the monorepo packages and apps.

## Boundaries Plugin Configuration

We use `eslint-plugin-boundaries` to enforce the dependency graph of our modular monolith:

- `@rishi/shared` has zero internal dependencies.
- `@rishi/domain` only imports from `@rishi/shared`.
- `@rishi/events` and `@rishi/auth` only import from `@rishi/domain` and `@rishi/shared`.
- `@rishi/config` is infrastructure-independent.
- `@rishi/logger` depends only on `@rishi/config` and `@rishi/shared`.
- `@rishi/transaction` depends on `@rishi/logger`, `@rishi/config`, and `@rishi/shared`.
- `@rishi/database` depends on `@rishi/transaction`, `@rishi/logger`, `@rishi/config`, `@rishi/domain`, and `@rishi/shared`.
- Sibling package internals must never be directly accessed. All imports must pass through the public export interface (`src/index.ts`).
