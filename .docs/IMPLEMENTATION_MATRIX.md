# Rishi AI Implementation Matrix

| Metadata | Value |
| :--- | :--- |
| **Purpose** | Provide informational traceability between major module designs, implementation, and tests |
| **Owner** | Repository Maintainer |
| **Lifecycle** | Current |
| **Authority** | Level 9 informational reference |
| **Implementation Driver** | No |
| **Status** | Verified snapshot |
| **Last Verified** | 2026-07-31 |

This matrix does not replace [CURRENT_STATE.md](CURRENT_STATE.md). `CURRENT_STATE.md` describes verified repository reality and blockers. This document only makes the evidence chain easier to locate. Source code, public APIs, schemas, and executable tests remain authoritative when this matrix becomes stale.

Implementation status uses only the vocabulary defined by [DOCUMENT_AUTHORITY.md](DOCUMENT_AUTHORITY.md).

| Module | ADR | TDD | Source Code Location | Test Location | Implementation Status | Last Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Configuration | [ADR-001](adrs/ADR-001_configuration_management.md) | [TDD-001](tdds/TDD-001_Config_Module.md) | `packages/config/src/` | `packages/config/src/index.test.ts` | Implemented | 2026-07-31 |
| Logging | [ADR-002](adrs/ADR-002_logger_architecture.md) | [TDD-002](tdds/TDD-002_Logger_Module.md) | `packages/logger/src/` | `packages/logger/src/index.test.ts` | Implemented | 2026-07-31 |
| Transaction context | [ADR-003](adrs/ADR-003_transaction_context_propagation.md) | [TDD-003](tdds/TDD-003_Transaction_Module.md) | `packages/transaction/src/` | `packages/transaction/src/index.test.ts` | Implemented | 2026-07-31 |
| Database and persistence | [ADR-004](adrs/ADR-004_lazy_database_connection.md) | [TDD-004](tdds/TDD-004_Database_Module.md) | `packages/database/src/`, `packages/database/migrations/` | `packages/database/src/index.test.ts`, `packages/database/src/persistence.test.ts` | Partially Implemented | 2026-07-31 |
| Storage | — | [TDD-005](tdds/TDD-005_Storage_Module.md) | — | — | Planned | 2026-07-31 |
| Authentication | [ADR-005](adrs/ADR-005_authentication_identity_foundation.md) | [TDD-006](tdds/TDD-006_Auth_Module.md) | `packages/auth/src/`, `apps/server/src/modules/auth/` | `apps/server/src/modules/auth/auth.controller.spec.ts`, `apps/server/src/modules/auth/services/auth-application.service.spec.ts` | Partially Implemented | 2026-07-31 |
| Authorization | [ADR-005](adrs/ADR-005_authentication_identity_foundation.md) | [TDD-007](tdds/TDD-007_Authorization_Module.md) | `apps/server/src/common/security/` | `apps/server/src/common/security/security.spec.ts` | Partially Implemented | 2026-07-31 |
| Durable queue | — | [TDD-008](tdds/TDD-008_Queue_Module.md) | — | — | Deferred | 2026-07-31 |
| Document parsing | — | [TDD-009](tdds/TDD-009_Parsing_Module.md) | — | — | Planned | 2026-07-31 |
| Vector curation and retrieval | — | [TDD-010](tdds/TDD-010_Vector_Curation_Module.md) | — | — | Planned | 2026-07-31 |
| Knowledge snapshots | — | [TDD-011](tdds/TDD-011_Snapshot_Module.md) | `packages/domain/src/`, `packages/database/src/repositories/snapshot.ts` | `packages/domain/src/domain.test.ts`, `packages/database/src/persistence.test.ts` | Partially Implemented | 2026-07-31 |
| Project workspace | — | [TDD-012](tdds/TDD-012_Project_Workspace_Module.md) | `apps/server/src/modules/projects/`, `packages/database/src/repositories/project.ts` | `packages/database/src/persistence.test.ts` | Partially Implemented | 2026-07-31 |
| Project memory | — | [TDD-013](tdds/TDD-013_Project_Memory_Module.md) | `packages/domain/src/`, `packages/database/src/repositories/memory.ts` | `packages/domain/src/domain.test.ts`, `packages/database/src/persistence.test.ts` | Partially Implemented | 2026-07-31 |
| Script structure | — | [TDD-014](tdds/TDD-014_Script_Structure_Module.md) | `packages/domain/src/`, `packages/database/src/repositories/block.ts` | `packages/domain/src/domain.test.ts`, `packages/database/src/persistence.test.ts` | Partially Implemented | 2026-07-31 |
| Prompt assembly | — | [TDD-015](tdds/TDD-015_Prompt_Assembly_Module.md) | — | — | Planned | 2026-07-31 |
| AI orchestration | — | [TDD-016](tdds/TDD-016_AI_Orchestration_Module.md) | `apps/server/src/foundation/ai/`, `apps/server/src/modules/workflows/services/workflow-engine.service.ts` | `apps/server/src/modules/workflows/workflows.controller.spec.ts` | Partially Implemented | 2026-07-31 |
| Compliance validation | — | [TDD-017](tdds/TDD-017_Compliance_Validation_Module.md) | — | — | Planned | 2026-07-31 |
| API controller boundary | [ADR-005](adrs/ADR-005_authentication_identity_foundation.md) | [TDD-018](tdds/TDD-018_API_Controller_Module.md) | `apps/server/src/common/api/`, `apps/server/src/modules/` | `apps/server/src/common/api/dto/api-response.dto.spec.ts`, `apps/server/src/common/api/filters/api-exception.filter.spec.ts`, `apps/server/src/modules/workflows/workflows.controller.spec.ts` | Partially Implemented | 2026-07-31 |
| Streaming | — | [TDD-019](tdds/TDD-019_Streaming_Module.md) | `apps/server/src/common/streaming/`, `apps/server/src/modules/workflows/workflows.controller.ts` | `apps/server/src/common/streaming/dto/stream-event.dto.spec.ts`, `apps/server/src/common/streaming/sse.interceptor.spec.ts`, `apps/server/src/modules/workflows/workflows.controller.spec.ts` | Partially Implemented | 2026-07-31 |
| Export | — | [TDD-020](tdds/TDD-020_Export_Module.md) | — | — | Planned | 2026-07-31 |
| Client view | — | [TDD-021](tdds/TDD-021_Client_View_App.md) | `apps/client/src/` | — | Partially Implemented | 2026-07-31 |

## Maintenance

Update this matrix only after applicable validation confirms a material change in implementation status, source location, test coverage, ADR applicability, or TDD applicability. A matrix update cannot promote planned work to implemented or authorize implementation.
