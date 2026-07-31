# Rishi AI Engineering Roadmap

| Metadata | Value |
| :--- | :--- |
| **Purpose** | Define the authoritative dependency order and completion state for engineering execution |
| **Owner** | Product Owner |
| **Lifecycle** | Current |
| **Authority** | Level 8 — Engineering execution sequence |
| **Implementation Driver** | No — an approved task contract authorizes each implementation increment |
| **Status** | Active |
| **Effective Date** | 2026-07-31 |
| **Supersedes** | All previous engineering execution plans, including the archived Engineering Execution Plan |

## 1. Execution Rules

- This is the authoritative engineering execution document for roadmap order and progress.
- Historical execution plans remain archived for reference only.
- Work proceeds in milestone and TDD dependency order.
- Complete one TDD before starting the next TDD unless the Product Owner explicitly approves an exception.
- Existing partial implementation must be completed and reconciled; it must not be duplicated.
- A roadmap item may not be skipped without explicit Product Owner approval.
- A deferred item may resume only with explicit Product Owner approval.
- An approved task contract remains required before implementation begins.
- Progress updates must reflect verified implementation state only.
- Milestone structure or dependency order may change only with architectural justification and Product Owner approval.

The current execution point is **Milestone 6, TDD-013 Project Memory**, which is partially implemented and pending an approved completion task. Later partial work remains preserved but does not change the dependency gate.

## 2. Status Vocabulary

- **Completed:** Acceptance criteria and repository-wide Definition of Done are satisfied.
- **In Progress:** An approved implementation task is actively executing.
- **Partial:** Material implementation exists, but acceptance criteria are incomplete.
- **Pending:** No material implementation exists and dependencies permit future execution.
- **Deferred:** Implementation is intentionally postponed by Product Owner decision.
- **Blocked:** Work cannot proceed until a declared dependency or approval is resolved.

## 3. Milestone 1 — Foundation

**Status:** Completed  
**Dependencies:** None

| TDD | Current Status | Objective | Dependencies | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| [TDD-001 Config](../tdds/TDD-001_Config_Module.md) | Completed | Provide validated, immutable environment configuration. | None | Required configuration is typed, validated before use, fails fast on invalid input, exposes no secret values, and is covered by tests. |
| [TDD-002 Logger](../tdds/TDD-002_Logger_Module.md) | Completed | Provide implementation-independent structured logging with correlation context. | TDD-001 | Logs are structured and single-line, correlation metadata is supported, the Pino implementation remains encapsulated, sensitive values are excluded, and tests pass. |
| [TDD-003 Transaction](../tdds/TDD-003_Transaction_Module.md) | Completed | Propagate deterministic transaction context across asynchronous execution. | TDD-002 | REQUIRED propagation, lifecycle validation, commit/rollback behavior, and AsyncLocalStorage isolation are implemented and tested. |

## 4. Milestone 2 — Persistence

**Status:** Completed

**Dependencies:** Milestone 1

| TDD | Current Status | Objective | Dependencies | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| [TDD-004 Database](../tdds/TDD-004_Database_Module.md) | Completed | Provide the complete PostgreSQL/Drizzle schema, migration, repository, and transaction integration foundation. | TDD-003; ADR-004 | Applicable schemas, constraints, indexes, migrations, public exports, and repository boundaries are complete; migrations apply to a clean database; database-backed constraint and rollback tests pass. |
| [TDD-005 Storage](../tdds/TDD-005_Storage_Module.md) | Completed | Provide vendor-independent binary storage behind a public provider contract. | TDD-001; TDD-004 completion gate | Local storage behavior, provider boundaries, safe path handling, binary read/write/delete operations, and contract tests are complete without leaking storage details into business code. |

## 5. Milestone 3 — Identity

**Status:** Completed

**Dependencies:** Milestone 2

| TDD | Current Status | Objective | Dependencies | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| [TDD-006 Auth](../tdds/TDD-006_Auth_Module.md) | Completed | Complete passwordless identity and session management. | TDD-004; ADR-005 | OTP, production delivery, access and refresh tokens, session rotation/revocation, secure cookies, approved OAuth scope, secret-safe behavior, and focused tests satisfy ADR-005. |
| [TDD-007 Authorization](../tdds/TDD-007_Authorization_Module.md) | Completed | Enforce workspace and resource ownership at every protected boundary. | TDD-006; ADR-005 | Default-deny authentication, workspace membership, nested resource ownership, cross-tenant rejection, and representative integration tests cover every protected resource type. |

## 6. Milestone 4 — Background Processing

**Status:** Completed

**Dependencies:** Milestones 2 and 3

| TDD | Current Status | Objective | Dependencies | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| [TDD-008 Queue](../tdds/TDD-008_Queue_Module.md) | Completed | Provide durable PostgreSQL-backed background execution. | TDD-003; TDD-004; TDD-007 | Dispatch, priority processing, advisory-lock serialization, retry policy, dead-letter handling, graceful shutdown/recovery, observability, and database-backed integration tests are complete. |

## 7. Milestone 5 — Knowledge Layer

**Status:** Completed
**Dependencies:** Milestones 2, 3, and 4

| TDD | Current Status | Objective | Dependencies | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| [TDD-009 Parsing](../tdds/TDD-009_Parsing_Module.md) | Completed | Convert supported uploaded documents into normalized deterministic text. | TDD-005; TDD-007; TDD-008 | Parser contracts and supported adapters validate input, produce normalized output, report deterministic failures, preserve tenant boundaries, and pass fixture-based tests. |
| [TDD-010 Vector Curation](../tdds/TDD-010_Vector_Curation_Module.md) | Completed | Chunk, embed, version, index, and retrieve grounded knowledge. | TDD-004; TDD-008; TDD-009 | Deterministic chunks, provider/version metadata, dimension validation, pgvector indexes, semantic retrieval, retry-safe processing, and database integration tests are complete. |
| [TDD-011 Snapshot](../tdds/TDD-011_Snapshot_Module.md) | Completed | Create immutable project-scoped knowledge snapshots and source grounding. | TDD-010 | Snapshot creation copies immutable source chunks transactionally; later source mutation cannot change prior snapshots; application services, persistence, and focused tests are complete. |

## 8. Milestone 6 — Workspace

**Status:** Partial
**Dependencies:** Milestone 5

| TDD | Current Status | Objective | Dependencies | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| [TDD-012 Project Workspace](../tdds/TDD-012_Project_Workspace_Module.md) | Completed | Complete the tenant-safe project aggregate and nine-stage state machine. | TDD-007; TDD-011 | Valid transitions, rejected out-of-order transitions, optimistic locking, project ownership, snapshot association, application APIs, and focused integration tests are complete. |
| [TDD-013 Project Memory](../tdds/TDD-013_Project_Memory_Module.md) | Partial | Preserve append-only project decisions and context history. | TDD-012 | Memory records are appended transactionally, cannot be silently rewritten, remain tenant-scoped, are accessible through application boundaries, and have focused tests. |
| [TDD-014 Script Structure](../tdds/TDD-014_Script_Structure_Module.md) | Partial | Complete ordered, lockable, source-grounded script blocks. | TDD-012 | Block lifecycle, ordering, locking, source associations, persistence, application APIs, authorization, and focused tests are complete. |

## 9. Milestone 7 — AI

**Status:** Partial and blocked  
**Dependencies:** Milestone 6 and approved background-processing decision

| TDD | Current Status | Objective | Dependencies | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| [TDD-015 Prompt Assembly](../tdds/TDD-015_Prompt_Assembly_Module.md) | Blocked | Compile deterministic, versioned, token-bounded working context. | TDD-010; TDD-013 | Template resolution, context ranking, token budgeting, deterministic compression, version metadata, validation, and focused tests are complete. |
| [TDD-016 AI Orchestration](../tdds/TDD-016_AI_Orchestration_Module.md) | Partial | Execute provider-independent generation through the approved workflow boundary. | TDD-008; TDD-015 | Public execution wiring, provider abstraction, retries, timeout/failure behavior, circuit breaking, run-state persistence, cost metadata, secret-safe logging, and focused engine tests are complete. |
| [TDD-017 Compliance Validation](../tdds/TDD-017_Compliance_Validation_Module.md) | Blocked | Validate generated structure, formatting, grounding, and citations before persistence. | TDD-014; TDD-016 | Invalid output is rejected before mutation; structural and citation rules are deterministic, traceable, provider-independent, and covered by focused tests. |

## 10. Milestone 8 — Product Delivery

**Status:** Partial and blocked  
**Dependencies:** Milestones 1 through 7

| TDD | Current Status | Objective | Dependencies | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| [TDD-018 API Controller](../tdds/TDD-018_API_Controller_Module.md) | Partial | Expose complete versioned, validated, authorized product APIs. | TDD-007; TDD-014; TDD-017 | Required product services are reachable through consistent DTOs, validation, error envelopes, pagination, authorization, idempotency where applicable, and API integration tests. |
| [TDD-019 Streaming](../tdds/TDD-019_Streaming_Module.md) | Partial | Deliver resumable SSE output without partial database mutation. | TDD-003; TDD-018 | Token buffering, lifecycle events, disconnect/reconnect behavior, transactional commit gates, error handling, and no-partial-write integration tests are complete. |
| [TDD-020 Export](../tdds/TDD-020_Export_Module.md) | Blocked | Export stable script structures into approved document formats. | TDD-018 | Markdown, PDF, and DOCX outputs are deterministic, validated, source-aware where required, available through the public API, and covered by format tests. |
| [TDD-021 Client View](../tdds/TDD-021_Client_View_App.md) | Partial | Deliver the usable customer-facing production workspace. | TDD-018; TDD-019; TDD-020 | Authentication, project navigation, research, editing, review, export, API/error states, accessibility, and representative UI tests support the approved end-to-end workflow. |

## 11. Repository-Wide Definition of Done

A roadmap task is complete only when:

- Implementation is complete against the approved task contract and summarized TDD outcome.
- Architecture, ADRs, public APIs, package boundaries, security, and tenant isolation are preserved.
- All mandatory repository validation succeeds.
- Applicable unit, integration, and end-to-end tests pass.
- [CURRENT_STATE.md](../CURRENT_STATE.md) is updated from verified repository evidence.
- [IMPLEMENTATION_MATRIX.md](../IMPLEMENTATION_MATRIX.md) is updated with accurate source, test, status, and verification data.
- Documentation changes follow [CHANGE_POLICY.md](../CHANGE_POLICY.md).
- Product Owner review is completed.

Partial implementation, compilation, or passing tests alone does not satisfy this Definition of Done.

## 12. Mandatory Validation Pipeline

Run from the repository root:

```bash
pnpm install
pnpm doctor
pnpm format
pnpm lint
pnpm build
pnpm typecheck
pnpm test
```

`build` precedes `typecheck` because workspace packages expose generated declaration files. This is the repository-required ordering adjustment to the validation command set.

No roadmap task may be marked Completed until every command succeeds. Failures, warnings, and skipped checks must be reported accurately; validation must not be suppressed or weakened.

## 13. Progress Maintenance

- Update a TDD status in this roadmap only after repository evidence and applicable validation confirm the change.
- Keep the milestone status consistent with its TDD statuses and dependency gates.
- Do not copy implementation details into this roadmap; TDDs retain design detail, ADRs retain decisions, `CURRENT_STATE.md` retains repository reality, and `IMPLEMENTATION_MATRIX.md` retains traceability.
- Preserve completed work and finish partial work when its dependency position is reached.
