# Rishi AI Documentation Index

| Metadata | Value |
| :--- | :--- |
| **Purpose** | Provide the canonical entry point for repository documentation |
| **Owner** | Repository Maintainer |
| **Lifecycle** | Current |
| **Authority** | Documentation navigation |
| **Implementation Driver** | No |
| **Status** | Active |
| **Last Reviewed** | 2026-07-31 |

## 1. Required Reading Order

For every task:

1. Read [DOCUMENT_AUTHORITY.md](DOCUMENT_AUTHORITY.md).
2. Read [CURRENT_STATE.md](CURRENT_STATE.md).
3. Read the approved task contract supplied by the Product Owner.
4. Read the applicable product requirement, non-superseded ADRs, architecture references, and TDDs below.
5. Verify implementation claims against source, schemas, public APIs, tests, branch, and worktree.
6. Follow [CHANGE_POLICY.md](CHANGE_POLICY.md) for authorized documentation changes.

[IMPLEMENTATION_MATRIX.md](IMPLEMENTATION_MATRIX.md) provides informational traceability but does not replace current-state or executable evidence.

## 2. Product and Architecture

| Document | Location | Purpose | Lifecycle | Authority | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Engineering Constitution | [product/ENGINEERING_CONSTITUTION.md](product/ENGINEERING_CONSTITUTION.md) | Preserve founding product and engineering philosophy | Reference | Historical philosophy; governance amendment applies | Founder & CTO | Frozen historical body |
| Product Requirements Document | [product/PRODUCT_REQUIREMENTS_DOCUMENT.md](product/PRODUCT_REQUIREMENTS_DOCUMENT.md) | Define product requirements and approved scope | Current | Level 2 | Product Owner | Frozen; product-scope amendment requires approval |
| Domain Model Specification | [product/DOMAIN_MODEL_SPECIFICATION.md](product/DOMAIN_MODEL_SPECIFICATION.md) | Describe intended domain model | Reference | Level 4 where approved and non-superseded | Architecture Owner | Partially implemented target design |
| System Design Document | [product/SYSTEM_DESIGN_DOCUMENT.md](product/SYSTEM_DESIGN_DOCUMENT.md) | Describe intended system architecture | Reference | Level 4 where approved and non-superseded | Architecture Owner | Partially implemented target design |

## 3. Architecture Decision Records

The active ADR location is [adrs/README.md](adrs/README.md). ADRs are binding Level 3 decisions when approved and non-superseded.

| ADR | Location | Status |
| :--- | :--- | :--- |
| ADR-001 Configuration Management | [adrs/ADR-001_configuration_management.md](adrs/ADR-001_configuration_management.md) | Approved |
| ADR-002 Logger Architecture | [adrs/ADR-002_logger_architecture.md](adrs/ADR-002_logger_architecture.md) | Approved |
| ADR-003 Transaction Context | [adrs/ADR-003_transaction_context_propagation.md](adrs/ADR-003_transaction_context_propagation.md) | Approved |
| ADR-004 Lazy Database Connection | [adrs/ADR-004_lazy_database_connection.md](adrs/ADR-004_lazy_database_connection.md) | Approved |
| ADR-005 Authentication Foundation | [adrs/ADR-005_authentication_identity_foundation.md](adrs/ADR-005_authentication_identity_foundation.md) | Approved; partially implemented |

## 4. Technical Design Documents

TDDs are frozen Level 9 design references. Their `Implementation Status` metadata records repository alignment; `IMPLEMENTATION READY` in a historical design status does not mean the module is implemented.

| TDD | Location | Implementation Status |
| :--- | :--- | :--- |
| TDD-001 Config | [tdds/TDD-001_Config_Module.md](tdds/TDD-001_Config_Module.md) | Implemented |
| TDD-002 Logger | [tdds/TDD-002_Logger_Module.md](tdds/TDD-002_Logger_Module.md) | Implemented |
| TDD-003 Transaction | [tdds/TDD-003_Transaction_Module.md](tdds/TDD-003_Transaction_Module.md) | Implemented |
| TDD-004 Database | [tdds/TDD-004_Database_Module.md](tdds/TDD-004_Database_Module.md) | Implemented |
| TDD-005 Storage | [tdds/TDD-005_Storage_Module.md](tdds/TDD-005_Storage_Module.md) | Implemented |
| TDD-006 Auth | [tdds/TDD-006_Auth_Module.md](tdds/TDD-006_Auth_Module.md) | Implemented |
| TDD-007 Authorization | [tdds/TDD-007_Authorization_Module.md](tdds/TDD-007_Authorization_Module.md) | Implemented |
| TDD-008 Queue | [tdds/TDD-008_Queue_Module.md](tdds/TDD-008_Queue_Module.md) | Planned |
| TDD-009 Parsing | [tdds/TDD-009_Parsing_Module.md](tdds/TDD-009_Parsing_Module.md) | Planned |
| TDD-010 Vector Curation | [tdds/TDD-010_Vector_Curation_Module.md](tdds/TDD-010_Vector_Curation_Module.md) | Planned |
| TDD-011 Snapshot | [tdds/TDD-011_Snapshot_Module.md](tdds/TDD-011_Snapshot_Module.md) | Partially Implemented |
| TDD-012 Project Workspace | [tdds/TDD-012_Project_Workspace_Module.md](tdds/TDD-012_Project_Workspace_Module.md) | Partially Implemented |
| TDD-013 Project Memory | [tdds/TDD-013_Project_Memory_Module.md](tdds/TDD-013_Project_Memory_Module.md) | Partially Implemented |
| TDD-014 Script Structure | [tdds/TDD-014_Script_Structure_Module.md](tdds/TDD-014_Script_Structure_Module.md) | Partially Implemented |
| TDD-015 Prompt Assembly | [tdds/TDD-015_Prompt_Assembly_Module.md](tdds/TDD-015_Prompt_Assembly_Module.md) | Planned |
| TDD-016 AI Orchestration | [tdds/TDD-016_AI_Orchestration_Module.md](tdds/TDD-016_AI_Orchestration_Module.md) | Partially Implemented |
| TDD-017 Compliance Validation | [tdds/TDD-017_Compliance_Validation_Module.md](tdds/TDD-017_Compliance_Validation_Module.md) | Planned |
| TDD-018 API Controller | [tdds/TDD-018_API_Controller_Module.md](tdds/TDD-018_API_Controller_Module.md) | Partially Implemented |
| TDD-019 Streaming | [tdds/TDD-019_Streaming_Module.md](tdds/TDD-019_Streaming_Module.md) | Partially Implemented |
| TDD-020 Export | [tdds/TDD-020_Export_Module.md](tdds/TDD-020_Export_Module.md) | Planned |
| TDD-021 Client View | [tdds/TDD-021_Client_View_App.md](tdds/TDD-021_Client_View_App.md) | Partially Implemented |

See [IMPLEMENTATION_MATRIX.md](IMPLEMENTATION_MATRIX.md) for source and test locations.

## 5. Engineering and Repository

| Document | Location | Purpose | Lifecycle | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Documentation Authority | [DOCUMENT_AUTHORITY.md](DOCUMENT_AUTHORITY.md) | Documentation authority and lifecycle | Current | Product Owner | Active |
| Change Policy | [CHANGE_POLICY.md](CHANGE_POLICY.md) | Documentation evolution | Current | Repository Maintainer | Active |
| Current State | [CURRENT_STATE.md](CURRENT_STATE.md) | Verified repository reality | Current | Repository Maintainer | Active |
| Implementation Matrix | [IMPLEMENTATION_MATRIX.md](IMPLEMENTATION_MATRIX.md) | Module traceability | Current | Repository Maintainer | Informational |
| Engineering Rulebook | [engineering/ENGINEERING_RULEBOOK.md](engineering/ENGINEERING_RULEBOOK.md) | Engineering standards for authorized tasks | Current | Product Owner | Active |
| Root README | [../README.md](../README.md) | Repository entry point and commands | Current | Repository Maintainer | Current-state aligned |
| Contributing Guide | [../CONTRIBUTING.md](../CONTRIBUTING.md) | Development workflow, boundaries, and tooling | Current | Repository Maintainer | Consolidated authority |
| Security Policy | [../SECURITY.md](../SECURITY.md) | Vulnerability reporting | Current | Product Owner / Security Owner | Contact commitments require confirmation |
| Code of Conduct | [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Contributor conduct | Current | Product Owner | Preserved |
| Changelog | [../CHANGELOG.md](../CHANGELOG.md) | Release history | Current | Repository Maintainer | Incomplete; no public release verified |
| Client README | [../apps/client/README.md](../apps/client/README.md) | Client responsibility and current state | Reference | Client Engineering Owner | Static shell documented |
| Server README | [../apps/server/README.md](../apps/server/README.md) | Server responsibility and boundaries | Reference | Server Engineering Owner | Current modules documented |
| Package READMEs | [`packages/*/README.md`](../packages/) | Package responsibility and public boundaries | Reference | Package Owners | Source remains authoritative |
| Docker README | [../docker/README.md](../docker/README.md) | Local database operation | Reference | Repository Maintainer | Local operation only |

GitHub issue and pull-request templates under `.github/` are current workflow support files.

## 6. Historical and Archive

Historical and Archive documents preserve earlier plans, status, audits, and processes. They never drive implementation.

| Document | Location | Lifecycle | Replacement |
| :--- | :--- | :--- | :--- |
| Engineering Execution Plan | [archive/plans/ENGINEERING_EXECUTION_PLAN.md](archive/plans/ENGINEERING_EXECUTION_PLAN.md) | Historical | Approved task contracts and current Product Owner priorities |
| Project Status | [archive/status/PROJECT_STATUS.md](archive/status/PROJECT_STATUS.md) | Historical | [CURRENT_STATE.md](CURRENT_STATE.md) |
| Documentation Verification Report | [archive/audits/DOCUMENTATION_VERIFICATION_REPORT.md](archive/audits/DOCUMENTATION_VERIFICATION_REPORT.md) | Historical | Current governance and verified state |
| AI Handoff Protocol | [archive/process/AI_HANDOFF_PROTOCOL.md](archive/process/AI_HANDOFF_PROTOCOL.md) | Archive | Authority, current state, and task contract |
| Checklists | [archive/process/CHECKLISTS.md](archive/process/CHECKLISTS.md) | Archive | Engineering Rulebook and Contributing Guide |
| Definition of Done | [archive/process/DEFINITION_OF_DONE.md](archive/process/DEFINITION_OF_DONE.md) | Archive | Engineering Rulebook |
| Engineering Agent | [archive/process/ENGINEERING_AGENT.md](archive/process/ENGINEERING_AGENT.md) | Archive | Task contract and ownership hierarchy |
| Implementation Protocol | [archive/process/IMPLEMENTATION_PROTOCOL.md](archive/process/IMPLEMENTATION_PROTOCOL.md) | Archive | Engineering Rulebook |
| Workflows | [archive/process/WORKFLOWS.md](archive/process/WORKFLOWS.md) | Archive | Engineering Rulebook and Contributing Guide |

## 7. Maintenance

- Add, remove, or reclassify entries only through [CHANGE_POLICY.md](CHANGE_POLICY.md).
- Keep deleted and merged legacy documents out of default navigation.
- Never infer implementation from a title, phase, or design-readiness label.
- Verify links, ownership, lifecycle, authority, and implementation status after every authorized documentation change.
