# Monorepo Guide & Governance

This document serves as the guide for contributing, adding packages, and managing dependencies within the Rishi AI modular monolith monorepo.

## Codebase Topology

```text
rishi-ai/
├── apps/               # Executable end applications
│   ├── client/         # React + Vite + Tailwind v4 frontend
│   └── server/         # NestJS + Fastify REST backend
├── packages/           # Decoupled shared libraries
│   ├── shared/         # Leaf utilities
│   ├── domain/         # TypeScript interface tokens
│   ├── events/         # Event payload definitions
│   ├── auth/           # Session contracts
│   ├── config/         # Environment validators
│   ├── logger/         # Structured logger factory
│   ├── transaction/    # ALS transaction context wrapper
│   ├── database/       # Connection pools & migration targets
│   └── testing/        # Test runner assets
└── configs/            # Config template inheritances
```

## Package Boundary Rules

To safeguard our codebase against circular references and modular degradation, we enforce the following import rules:

- **No Sibling Internals:** Do not import sibling files directly (e.g. `import { ... } from "../database/src/internal/db"`). Always import through the public namespace token (`import { ... } from "@rishi/database"`).
- **No Upward Coupling:** Library packages (`packages/*`) must **never** import executable applications (`apps/*`).
- **Shared Leaf Is Isolation:** `@rishi/shared` must remain entirely free of internal workspace dependencies.
- **Domain Decoupling:** `@rishi/domain` must contain only pure TS interfaces and must not import third-party frameworks like NestJS or ORMs like Drizzle.

These boundaries are automatically audited in the CI pipeline using `eslint-plugin-boundaries`.

## Adding a New Package

1. Create a sub-folder under `packages/` (e.g., `packages/new-module/`).
2. Add a `package.json` declaring its name under `@rishi/new-module` and set `"private": true`.
3. Add a `tsconfig.json` extending `../../configs/typescript/tsconfig.node.json` and map references correctly.
4. Reference the new package under the root `tsconfig.json` references.
5. Create a `README.md` defining its responsibility and boundaries.
6. Register the package pattern inside the ESLint configuration (`configs/eslint/eslint.config.js`) boundaries settings.
