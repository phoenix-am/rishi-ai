# Rishi AI Current State

| Metadata | Value |
| :--- | :--- |
| **Purpose** | Record the last verified factual implementation state of the repository |
| **Owner** | Repository Maintainer |
| **Lifecycle** | Current |
| **Authority** | Level 7 — Verified status |
| **Implementation Driver** | No |
| **Status** | Verified TDD-006 review-ready snapshot with uncommitted work |
| **Snapshot Date** | 2026-07-31 |
| **Branch** | `main` |
| **HEAD** | `c4184cdd9a7d704149100997e5f5499d1bcdaafa` |

## 1. Purpose and Limits

This document records repository reality. It is not a roadmap, implementation plan, product specification, or architecture decision.

Source code, schemas, public APIs, tests, and the current worktree remain authoritative when this snapshot becomes stale. This document is updated only after successful applicable validation.

## 2. Repository Overview

Rishi AI is a private pnpm TypeScript modular monolith containing:

- `apps/client`: React 19, Vite, Tailwind CSS client application.
- `apps/server`: NestJS 11 application using Fastify.
- `packages/auth`
- `packages/config`
- `packages/database`
- `packages/domain`
- `packages/events`
- `packages/logger`
- `packages/shared`
- `packages/storage`
- `packages/testing`
- `packages/transaction`
- PostgreSQL 16 with pgvector for local database infrastructure.

The working tree is not clean. It contains the validated TDD-006 implementation and required status updates described by this snapshot. These items are not represented by the recorded HEAD commit.

## 3. Current Implementation Status

### Implemented

- pnpm workspace, TypeScript project references, linting, formatting, Vitest, Husky, commitlint, and GitHub Actions foundations.
- Validated environment configuration through `@rishi/config`.
- Structured Pino logging through `@rishi/logger`.
- AsyncLocalStorage transaction propagation through `@rishi/transaction`.
- Complete TDD-004 PostgreSQL/Drizzle foundation through `@rishi/database`: lazy connections, explicit migration execution, current schemas, constraints, indexes, pgvector columns, public exports, mappers, repositories, and database-backed migration/rollback coverage.
- TDD-005 storage foundation through `@rishi/storage`: public provider contract and injection token, service facade, validated local-provider configuration, safe portable object paths, atomic binary writes, reads, idempotent deletes, stable storage errors, and unit/integration coverage.
- Core domain entities, value objects, repository/provider contracts, and domain events through `@rishi/domain`.
- NestJS/Fastify bootstrap, validation, request context, response envelopes, exception handling, rate limiting, health route, Swagger support, and API versioning.
- TDD-006 authentication through `@rishi/auth` and `apps/server`: hashed, bounded, one-time passwordless OTPs; production SMTP delivery; Google OAuth with signed state and minimal scopes; atomic user/workspace/session provisioning; RS256 access tokens; hashed refresh sessions with conditional rotation and revocation; signed secure cookies; logout; and current-user lookup.
- Workspace membership guard and tenant-scoped API patterns.
- Creator CRUD API.
- Workflow definition CRUD and workflow-run persistence API.
- Project create/update/get/list API.
- Content-asset create/update/get/list-by-project API.
- Gemini text-generation adapter and Google TTS adapter.
- In-process workflow lifecycle events and an SSE endpoint for workflow-run events.
- S0.1 security corrections for example key material, credential-bearing database logging, and the two high-severity dependency paths.

### Partially Implemented

- `@rishi/events`: a minimal event contract package exists; there is no complete event subsystem or durable outbox.
- `@rishi/testing`: one shared assertion helper exists; the documented broader testing toolkit does not.
- Database/domain support for knowledge assets, chunks, snapshots, snapshot chunks, script-block sources, script blocks, project memory, and generation-job persistence exists without the later application workflows.
- Workflow engine execution logic exists, but the public run-creation path does not invoke it. Runs remain `PENDING` unless the engine is called outside the public flow.
- AI orchestration supports a narrow set of node types and lacks the documented queue, retry, failover, circuit-breaker, compliance, and prompt-assembly layers.
- Streaming provides run lifecycle notifications, not the documented token-buffered transactional streaming pipeline.
- The client application compiles but displays only a static scaffolding shell.

### Planned or Deferred

- Production cloud object-storage adapter; the local storage provider and provider boundary are implemented.
- Document upload and parsing pipeline.
- Embedding generation, vector curation, and semantic retrieval.
- Immutable snapshot-chunk workflow and source grounding.
- Nine-stage project state machine and active project-memory workflow.
- Prompt-template registry, working-context compiler, and token-budget enforcement.
- Compliance and citation validation.
- Durable PostgreSQL-backed queue and worker processing; async processing is deferred in the existing status material.
- Script-block application APIs and document-first editor.
- Markdown, PDF, and DOCX export module.
- Trial quota, subscription, and billing enforcement.
- Production application deployment and repeatable migration execution.

## 4. Applications and Packages

| Component | Verified State |
| :--- | :--- |
| `apps/server` | Substantially implemented backend foundation; product workflow incomplete |
| `apps/client` | Buildable static shell |
| `@rishi/config` | Implemented |
| `@rishi/logger` | Implemented |
| `@rishi/transaction` | Implemented |
| `@rishi/database` | TDD-004 persistence foundation implemented; later application workflows remain separate roadmap work |
| `@rishi/storage` | TDD-005 local storage implementation complete; cloud providers remain future adapters |
| `@rishi/domain` | Substantial but partially aligned with current application model |
| `@rishi/shared` | Implemented, minimal |
| `@rishi/events` | Partial |
| `@rishi/auth` | TDD-006 public contracts and server authentication implementation complete |
| `@rishi/testing` | Partial/minimal |

The repository does not contain `@rishi/users`, `@rishi/brain`, `@rishi/prompts`, `@rishi/tools`, or `@rishi/llms` packages.

## 5. Known Blockers and Risks

### Stabilization blockers

- The worktree contains the uncommitted TDD-006 implementation described by this snapshot.
- Historical status, architecture, TDD, process, and README documents remain inconsistent; S0.4 cleanup has not occurred.
- The public workflow-run endpoint does not connect run creation to `WorkflowEngineService.execute()`.
- The documented durable queue is absent, leaving workflow execution semantics unresolved.
- Direct content-asset creation does not verify that the supplied project belongs to the active workspace.
- Optional PostgreSQL integration mode passes its database assertions but can report an unhandled connection-termination error during TDD-004 test teardown; the required default test command is unaffected.

### Beta blockers

- No functional customer-facing client flow.
- No minimum source-grounded research-to-script workflow.
- No trial/paywall or billing implementation.
- No production application deployment process.

### Security follow-up

- The production dependency audit is currently clean after S0.1.
- Rotation of the previously exposed local JWT key is recommended. Repository evidence does not prove external use, and rotation has not been performed or claimed.

## 6. Current Roadmap Stage

The repository is at **Milestone 3, TDD-006 Authentication** in the authoritative engineering roadmap. Implementation and validation are complete; Product Owner review remains the final completion gate. TDD-007 Authorization is the next scheduled task and was not implemented by this task.

Historical `Phase 1–10` and stabilization labels remain Git-history milestones. They are not used by this document to assert current readiness.

## 7. Last Verified Validation

The current worktree was last fully validated on 2026-07-31 during TDD-006:

| Command | Result |
| :--- | :--- |
| `pnpm install` | Passed |
| `pnpm run doctor` | Passed |
| `pnpm format` | Passed with existing module-type warning |
| `pnpm lint` | Passed with existing ESLint configuration warnings |
| `pnpm build` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed — 29 files and 183 tests passed; 1 file and 3 opt-in PostgreSQL tests skipped |
| `pnpm audit --prod --audit-level high` | Passed — no known production dependency vulnerabilities |
| `git diff --check` | Passed |

These results cover the TDD-006 worktree, including public contracts, OTP delivery and replay controls, Google OAuth state handling and verified identity, centralized RS256 token handling, refresh-session rotation, secure cookies, configuration, controller behavior, and public exports. The opt-in PostgreSQL integration tests remain skipped by the required default command; their previously recorded TDD-004 teardown risk is unchanged and no database code was modified by TDD-006.

## 8. Verification Process

CURRENT_STATE.md may be updated only when all of the following are true:

1. The branch, HEAD, and worktree state are inspected.
2. Implementation claims are traced to source, schemas, public APIs, and tests.
3. All task-relevant repository validation commands have completed successfully.
4. Failures, warnings, skipped checks, and external dependencies are recorded accurately.
5. Planned work is not reported as implemented.
6. The update identifies its snapshot date and verification scope.

If validation fails, the previous verified result remains recorded and the new failure is added as a blocker; the document must not claim a successful new baseline.
