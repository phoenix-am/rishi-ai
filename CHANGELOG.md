# Changelog

| Metadata          | Value                                                                     |
| :---------------- | :------------------------------------------------------------------------ |
| **Lifecycle**     | Current                                                                   |
| **Owner**         | Repository Maintainer                                                     |
| **Status**        | Incomplete after repository initialization; no public release is verified |
| **Last Verified** | 2026-07-31                                                                |

All notable changes to the Rishi AI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-17

### Added

- Initialized pnpm monorepo structure.
- Scaffolded application shells: NestJS + Fastify (`apps/server`) and React + Vite + Tailwind CSS v4 + shadcn/ui (`apps/client`).
- Created shared TypeScript packages (`shared`, `domain`, `events`, `auth`, `config`, `logger`, `transaction`, `database`, `testing`).
- Configured local Docker infrastructure containing PostgreSQL 16 + pgvector.
- Implemented static linter and formatting policies (ESLint, Prettier, EditorConfig, commitlint, husky).
- Configured monorepo governance documentation (`MONOREPO_GUIDE.md`, ADR directory layout, and package READMEs).
- Implemented repository doctor checks (`scripts/repo-doctor.ts`).
