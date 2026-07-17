# Rishi AI — Engineering Execution Plan (EEP)

## Version 1.1.0 — Authoritative Implementation Blueprint

This document defines the strict, dependency-driven engineering execution sequence for building Rishi AI Version 1.0.0 from an empty repository to a production-ready, context-preserved MVP. In strict alignment with the frozen architectural baseline, this document excludes time estimates, story points, and project management artifacts, functioning exclusively as a technical blueprint for downstream Technical Design Documents (TDDs).

---

## Table of Contents

1. [Global Master Strategy & Execution Metrics](#1--global-master-strategy--execution-metrics)
2. [Phased Engineering Sequence](#2--phased-engineering-sequence)
3. [Engineering Execution Interrelation Matrix](#3--engineering-execution-interrelation-matrix)
4. [Architectural Boundary Validation](#4--architectural-boundary-validation)
5. [Official TDD Numbering Convention](#5--official-tdd-numbering-convention)
6. [Deliverables to TDD Master Mapping](#6--deliverables-to-tdd-master-mapping)

---

## 1. Global Master Strategy & Execution Metrics

### 1.1 The Critical Path

The execution sequence is structurally bound by a linear propagation of system dependencies. The absolute critical path through which data must flow to avoid code regression or design rework is defined as:

```
[Phase 1: Baseline Foundation] 
              │
              ▼
[Phase 2: Persistence Abstractions] 
              │
              ▼
[Phase 3: Identity & Boundary Guards] 
              │
              ▼
[Phase 4: Asynchronous Queue Engine] 
              │
              ▼
[Phase 5: Knowledge & Ingestion Layer] 
              │
              ▼
[Phase 6: Project Aggregate Workspace] 
              │
              ▼
[Phase 7: AI Orchestration Subsystem] 
              │
              ▼
[Phase 8: API Interfaces & Client Shell]

```

### 1.2 Parallelizable Work

While the core architecture is highly sequential, specific decoupled components can be engineered concurrently once their abstract interface tokens are written and registered within the NestJS dependency container:

* **During Phase 5:** Developing individual file type handlers behind the `IDocumentParser` interface (e.g., `PdfParserAdapter`, `DocxParserAdapter`) can run completely in parallel.
* **During Phase 7:** Developing separate vendor adapters behind the `IAiProviderAdapter` interface (e.g., `GeminiAdapter`, `OpenAiAdapter`) can run independently.
* **During Phase 8:** Building out frontend component layout viewports for the React client environment can proceed asynchronously, provided they consume the standardized API JSON envelope interfaces.

### 1.3 System Milestones Ledger

| Milestone Type | Target Baseline Delivery Phase | Validation Mechanism |
| --- | --- | --- |
| **Infrastructure** | Phase 2: Persistence Abstractions | Automatic schema verification matching the Drizzle physical layout against PostgreSQL system tables. |
| **Security** | Phase 3: Identity & Boundary Guards | Execution of an automated security integration test forcing a cross-tenant ID lookup to verify structural project containment. |
| **Testing** | Phase 1: Core Foundation | Establishing shared contract test harnesses using Vitest to enforce behavioral typing across future drivers. |
| **Performance** | Phase 5: Knowledge & Ingestion Layer | Executing isolated database benchmark tests against the HNSW pgvector index layer to verify lookups process under 50ms. |
| **Documentation** | Every Phase (Concurrent Execution) | Compilation of programmatic TDDs strictly corresponding to active implementation blocks before a single file writes to master code branches. |

---

## 2. Phased Engineering Sequence

### Phase 1: Core Foundation & Cross-Cutting Concerns

* **Objective:** Establish a rock-solid, type-safe development perimeter containing the universal environmental parameters, logging capabilities, and runtime lifecycle hooks required by every downstream module.
* **Scope:** Configuration loading, environmental parsing, centralized structured log tracking, correlation tracing, database transaction abstractions, and the base testing environment configuration.
* **Dependencies:** None (Empty Repository State).
* **Deliverables:** Centralized Zod config utility, Pino logger middleware, NestJS `AsyncLocalStorage` (ALS) transaction wrapper, and the baseline Vitest execution configuration.
* **Acceptance Criteria:** The NestJS bootstrap cycle must instantly abort execution if any environmental parameter deviates from the Zod configuration schema, and the server log framework must print purely single-line JSON metadata strings.
* **Risks:** Premature introduction of framework dependencies or configuration leak vulnerabilities.
* **Exit Criteria:** 100% of core cross-cutting foundation modules compile cleanly under strict TypeScript configurations with active Vitest unit harnesses passing locally.

#### Modules Included

##### Module 1.1: ConfigModule

* *Purpose:* Centralize validation, parsing, and internal mapping of system parameters using explicit Zod validation schemas.
* *Why It Exists:* Eliminates unpredictable runtime behavior caused by missing, malformed, or contextually leaked environment variables.
* *Why This Phase:* Every structural component, database driver, queue connector, and AI gateway requires immediate configuration data to initialize.
* *Previous Dependencies:* None.
* *Future Dependencies:* Every system package across the logic monolith.

##### Module 1.2: LoggerModule

* *Purpose:* Implement ultra-high-speed structured tracing capabilities utilizing Pino wrappers embedded inside the NestJS framework.
* *Why It Exists:* Satisfies the Observability requirements by forcing every system component to print standardized JSON rows including distinct Correlation IDs.
* *Why This Phase:* Error interceptors, HTTP request monitors, and test log structures require logging tools to expose debug metrics immediately.
* *Previous Dependencies:* `ConfigModule`.
* *Future Dependencies:* All backend modules.

##### Module 1.3: TransactionModule

* *Purpose:* Build a technology-agnostic transaction provider using `AsyncLocalStorage` to isolate database context states without passing ORM parameters down the call stack.
* *Why It Exists:* Secures the Exactly-Once Commit Rule, ensuring multi-stage operations fail or roll back atomically.
* *Why This Phase:* Forms the behavioral execution boundary for the database repository layer built in Phase 2.
* *Previous Dependencies:* `LoggerModule`.
* *Future Dependencies:* All repository implementations and transactional services.

---

### Phase 2: Core Persistence & Shared Storage Suite

* **Objective:** Provision the data access layers and binary storage abstractions required to execute structural database operations securely without coupling business packages to individual vendor logic.
* **Scope:** Drizzle ORM layout bindings, physical schema deployment configurations, repository contract harnesses, the file system storage wrapper, and the deferred domain outbox engine.
* **Dependencies:** Phase 1 (Core Foundation).
* **Deliverables:** Concrete table schema mappings, `DrizzleProjectRepository`, `DrizzleKnowledgeRepository`, `LocalFileStorageProvider`, and the ALS database transaction log queue.
* **Acceptance Criteria:** Executing repository integration tests must pass cleanly through transactional rollback loops, leaving the backing database footprint completely unaltered.
* **Risks:** Leaking ORM or vendor-specific SQL patterns back into repository interface boundaries.
* **Exit Criteria:** Database tables successfully deploy matching all defined constraints, and the storage suite passes binary write validation tests.

#### Modules Included

##### Module 2.1: DatabaseModule

* *Purpose:* Establish the physical relational data schema mapping matching the approved tables via type-safe Drizzle expressions.
* *Why It Exists:* Translates our domain objects (Creators, Projects, Chunks, Snapshots, Jobs) into highly performant database structures.
* *Why This Phase:* Provides the storage foundation for all persistence and identity logic.
* *Previous Dependencies:* `TransactionModule`.
* *Future Dependencies:* All data access packages.

##### Module 2.2: StorageModule

* *Purpose:* Construct the binary file orchestration layer behind the decoupled `IFileStorageProvider` interface.
* *Why It Exists:* Prevents business code from interacting with physical hardware disks or cloud object stores directly, enabling seamless migration to Cloudflare R2.
* *Why This Phase:* Ingestion pipelines require target storage destinations to handle reference documents securely.
* *Previous Dependencies:* `ConfigModule`.
* *Future Dependencies:* `ParsingModule`.

---

### Phase 3: Identity & Extensible Authorization

* **Objective:** Implement a zero-maintenance, passwordless access perimeter capable of enforcing rigid tenant isolation at the API gateway layer.
* **Scope:** Fastify token interceptors, passwordless email OTP generation mechanics, Google OAuth state handlers, and the `CreatorIsolationGuard`.
* **Dependencies:** Phase 2 (Core Persistence).
* **Deliverables:** Identity verification controllers, asymmetric RS256 token signing filters, and cross-tenant route insulation logic.
* **Acceptance Criteria:** Any HTTP request omitting a valid token or passing a `projectId` belonging to a different creator profile must abort instantly with an explicit `401` or `403` response before hitting business controllers.
* **Risks:** Token rotation edge-case gaps or cross-tenant scope bypass errors.
* **Exit Criteria:** All validation filters pass testing, and the multi-tenant runway handles simulated role injections cleanly.

#### Modules Included

##### Module 3.1: AuthModule

* *Purpose:* Manage stateless identity verification using passwordless secure tokens and federated Google sign-in workflows.
* *Why It Exists:* Eliminates password storage liabilities and credential recovery overhead for a solo founder.
* *Why This Phase:* Secures every system interaction and establishes the foundational creator aggregate anchor.
* *Previous Dependencies:* `DatabaseModule`.
* *Future Dependencies:* Every user-accessible controller endpoint.

##### Module 3.2: AuthorizationModule

* *Purpose:* Enforce tenant containment rules via structural guard layers checking resource ownership.
* *Why It Exists:* Satisfies the non-negotiable Context Isolation Invariant, blocking cross-user context exposure.
* *Why This Phase:* Must be active prior to building workspace modules to guarantee data security during development.
* *Previous Dependencies:* `AuthModule`.
* *Future Dependencies:* `ProjectWorkspaceModule`, `ParsingModule`, `PromptAssemblyModule`.

---

### Phase 4: Asynchronous Task Engine

* **Objective:** Build out the background worker orchestration engine running reliably over the primary PostgreSQL instance to decouple intensive compute workloads from the server router loop.
* **Scope:** The centralized `QueueService` interface framework, task processing decorators (`@ProcessTask`), queue priority routing, advisory-lock concurrency guardrails, and the Dead Letter Queue (DLQ) recovery mechanism.
* **Dependencies:** Phase 2 and Phase 3.
* **Deliverables:** Programmatic job dispatchers, background execution managers, task retry controllers, and system graceful-shutdown modules.
* **Acceptance Criteria:** Simultaneously dispatching overlapping tasks targeting the exact same block ID must trigger database advisory block locks, forcing serialization and preventing duplicate compute tasks.
* **Risks:** Shared memory overhead or job starvation across low-priority background queues.
* **Exit Criteria:** Automated tests verify workers pick up high-priority tasks in sub-second timelines while gracefully preserving unfinished tasks during server reboots.

#### Modules Included

##### Module 4.1: QueueModule

* *Purpose:* Build the background task framework behind the decoupled `IQueueService` interface, defaulting to database-backed runner daemons.
* *Why It Exists:* Isolates the logical monolith from complex third-party messaging systems while shielding web requests from computational processing lockups.
* *Why This Phase:* Heavy ingestion processing and multi-stage script writes require an operational background runner.
* *Previous Dependencies:* `DatabaseModule`, `TransactionModule`.
* *Future Dependencies:* `VectorCurationModule`, `AiOrchestrationModule`.

---

### Phase 5: Knowledge Curation & RAG Layer

* **Objective:** Construct an extensible ingestion, chunking, and semantic search ecosystem capable of delivering trusted knowledge grounding without external infrastructure costs.
* **Scope:** The `IDocumentParser` infrastructure subsystem, configuration-driven layout splitters, `IEmbeddingProvider` abstractions, `pgvector` HNSW search logic, and the unalterable `knowledge_snapshots` data generator.
* **Dependencies:** Phase 4 (Asynchronous Task Engine).
* **Deliverables:** Document parsing adapters, vector chunk execution services, and the historical snapshot generation subsystem.
* **Acceptance Criteria:** Modifying or soft-deleting a core text asset in the primary library must leave existing project snapshots completely functional, verified by running deterministic vector lookups against frozen target data.
* **Risks:** Embedding model dimension shifts or tokenization errors during text splitting loops.
* **Exit Criteria:** High-volume reference texts successfully process asynchronously into granular chunks, returning semantic lookups with accurate cosine distances in under 50ms.

#### Modules Included

##### Module 5.1: ParsingModule

* *Purpose:* Implement specialized text extractor adapters acting behind the `IDocumentParser` interface contract.
* *Why It Exists:* Sanitizes diverse input formats into standard text payloads cleanly, protecting processing modules from layout variations.
* *Why This Phase:* Converts uploaded document buffers asynchronously into plain text blocks before vector creation.
* *Previous Dependencies:* `StorageModule`, `AuthorizationModule`.
* *Future Dependencies:* `VectorCurationModule`.

##### Module 5.2: VectorCurationModule

* *Purpose:* Coordinate text chunking routines, versioned vector generation via `IEmbeddingProvider`, and HNSW `pgvector` indexing.
* *Why It Exists:* Translates plain scriptural text into multi-dimensional vectors to drive localized RAG semantic search loops.
* *Why This Phase:* Serves as the technical core of the platform's domain-grounding capabilities.
* *Previous Dependencies:* `QueueModule`, `DatabaseModule`, `ParsingModule`.
* *Future Dependencies:* `SnapshotModule`, `PromptAssemblyModule`.

##### Module 5.3: SnapshotModule

* *Purpose:* Automate the generation of unalterable reference data blocks when attaching documents to individual workspaces.
* *Why It Exists:* Guarantees the Snapshot Preservation Policy, ensuring absolute project reproducibility regardless of future library deletions.
* *Why This Phase:* Must be locked down prior to initializing the final script creation workspace models.
* *Previous Dependencies:* `VectorCurationModule`.
* *Future Dependencies:* `ProjectWorkspaceModule`.

---

### Phase 6: Project Workspace & State Machine

* **Objective:** Model the primary aggregate container managing the content creation lifecycle, including its step-by-step state transitions and historical data tracking.
* **Scope:** Project configuration tables, the structural project state engine, append-only `project_memories` logging services, and script block structural layout rules.
* **Dependencies:** Phase 5 (Knowledge Curation & RAG Layer).
* **Deliverables:** The `ProjectAggregate` state processor, contextual history recording systems, and modular text block schema configurations.
* **Acceptance Criteria:** Out-of-order workflow updates must fail explicitly via optimistic locking validations, forcing all state transitions to commit matching exactly the active version key.
* **Risks:** Data version conflicts or unstructured storage growth inside history tables.
* **Exit Criteria:** Integration suites verify projects transition across all 9 distinct functional phases with clear historical data logs created for every single state update.

#### Modules Included

##### Module 6.1: ProjectWorkspaceModule

* *Purpose:* Enforce the structural operations of the 9-stage Project State Machine and protect data bounds.
* *Why It Exists:* Serves as the core business container for the content production ecosystem.
* *Why This Phase:* Connects our knowledge ingestion subsystems directly to the creative content pipeline workspace.
* *Previous Dependencies:* `SnapshotModule`, `AuthorizationModule`.
* *Future Dependencies:* `ProjectMemoryModule`, `ScriptStructureModule`.

##### Module 6.2: ProjectMemoryModule

* *Purpose:* Record creator choices, approved context records, and milestones into an explicit append-only transactional system.
* *Why It Exists:* Preserves absolute contextual continuity over long creation cycles while isolating historical logs from transient task steps.
* *Why This Phase:* Required to build out the prompt compilation engine, which depends directly on structured context histories.
* *Previous Dependencies:* `ProjectWorkspaceModule`.
* *Future Dependencies:* `PromptAssemblyModule`.

##### Module 6.3: ScriptStructureModule

* *Purpose:* Manage the layout positions and identity records of the independent text units that make up the final script output.
* *Why It Exists:* Establishes our modular Script Block Architecture, enabling targeted updates and selective locks on separate document parts.
* *Why This Phase:* Defines the structural targets for the AI generation module built in Phase 7.
* *Previous Dependencies:* `ProjectWorkspaceModule`.
* *Future Dependencies:* `ComplianceValidationModule`, `ApiControllerModule`.

---

### Phase 7: AI Orchestration Subsystem

* **Objective:** Assemble the modular prompt management registry and interchangeable LLM gateway adapters, creating an isolated text generation pipeline.
* **Scope:** The `IAiProviderAdapter` interface wrappers, the centralized `PromptTemplateRegistry`, dynamic token budgeting rules, post-AI compliance logic, and `GenerationJob` tracking services.
* **Dependencies:** Phase 6 (Project Workspace & State Machine).
* **Deliverables:** The prompt generation engine, execution tracking repositories, model failure circuit breakers, and post-generation compliance checks.
* **Acceptance Criteria:** Assembling a prompt payload that breaches token constraints must automatically compress the payload context by dropping lower-ranked reference chunks, protecting against token overflow errors.
* **Risks:** Vendor signature updates or high inference latency during complex semantic lookups.
* **Exit Criteria:** System successfully generates, validates, and records targeted text content block-by-block using synthetic models, tracking cost metrics with perfect precision.

#### Modules Included

##### Module 7.1: PromptAssemblyModule

* *Purpose:* Orchestrate token evaluation, semantic context compression, and dynamic system instruction loading.
* *Why It Exists:* Implements the critical Working Context Principle in volatile application memory, preventing token accumulation costs.
* *Why This Phase:* Must be stable before exposing prompt data patterns to underlying provider adapters.
* *Previous Dependencies:* `ProjectMemoryModule`, `VectorCurationModule`.
* *Future Dependencies:* `AiOrchestrationModule`.

##### Module 7.2: AiOrchestrationModule

* *Purpose:* Manage outbound text generation tasks using interchangeable provider wrappers, handling connection retry states and circuit breakers.
* *Why It Exists:* Ensures total vendor independence, allowing the platform to route tasks smoothly across different AI models.
* *Why This Phase:* Acts as the primary execution engine for all content generation across the application workspace.
* *Previous Dependencies:* `QueueModule`, `PromptAssemblyModule`.
* *Future Dependencies:* `ComplianceValidationModule`.

##### Module 7.3: ComplianceValidationModule

* *Purpose:* Intercept raw generation outputs to run formatting, structural layout, and citation verification checks.
* *Why It Exists:* Guarantees that only structurally sound text containing verifiable citations is written to the core database.
* *Why This Phase:* Acts as the final quality gate in the generation chain before persistence operations fire.
* *Previous Dependencies:* `AiOrchestrationModule`, `ScriptStructureModule`.
* *Future Dependencies:* `ApiControllerModule`.

---

### Phase 8: API Interfaces & Client Shell

* **Objective:** Expose the modular monolith features through a versioned API and deploy a high-focus web interface to support end-to-end user workflows.
* **Scope:** Fastify versioned route configurations, Server-Sent Events (SSE) token buffering gates, correlation identity log mapping, the Vite client workspace setup, and the Document-First inline editing experience.
* **Dependencies:** All previous backend modules (Phases 1 through 7).
* **Deliverables:** Functional API endpoints, persistent SSE stream handlers, the React client shell, and the Markdown/PDF compilation export systems.
* **Acceptance Criteria:** Simulating a network dropout during an active SSE stream must leave the core database block completely unchanged, verified by checking that text mutations commit only after complete stream delivery.
* **Risks:** Browser rendering bottlenecks or stream synchronization errors across volatile mobile networks.
* **Exit Criteria:** A solo creator can securely sign in passwordlessly, upload reference materials, organize background research via clean curation panels, and generate and edit a complete Editorial Script block-by-block with zero context degradation.

#### Modules Included

##### Module 8.1: ApiControllerModule

* *Purpose:* Expose versioned network endpoints (`/api/v1/*`) enforcing standardized contracts and global error tracking.
* *Why It Exists:* Provides external access points to application features, using unified Correlation IDs to trace every request.
* *Why This Phase:* Connects our underlying modular monolith subsystems to client interfaces securely.
* *Previous Dependencies:* `AuthorizationModule`, `ScriptStructureModule`, `ComplianceValidationModule`.
* *Future Dependencies:* `StreamingModule`, `ExportModule`, `ClientViewApp`.

##### Module 8.2: StreamingModule

* *Purpose:* Coordinate real-time token streaming using Fastify-backed Server-Sent Events combined with transactional memory buffers.
* *Why It Exists:* Enhances perceived interface responsiveness while protecting script entities from partial write corruptions.
* *Why This Phase:* Required to build out the interactive inline assistant experience.
* *Previous Dependencies:* `ApiControllerModule`, `TransactionModule`.
* *Future Dependencies:* `ClientViewApp`.

##### Module 8.3: ExportModule

* *Purpose:* Process internal script structures into clean text documents (Markdown, PDF, DOCX).
* *Why It Exists:* Bypasses video production complexities by outputting high-quality text files that fit perfectly into creators' existing workflows.
* *Why This Phase:* Serves as the final delivery mechanism for our core MVP workspace pipeline.
* *Previous Dependencies:* `ApiControllerModule`.
* *Future Dependencies:* `ClientViewApp`.

##### Module 8.4: ClientViewApp

* *Purpose:* Deploy a highly optimized Vite + React user interface that emphasizes a Document-First editing layout enhanced by pull-based AI capabilities.
* *Why It Exists:* Hides systemic complexity behind a familiar, clean interface that minimizes cognitive friction for creators.
* *Why This Phase:* Completes the full system lifecycle loop, delivering a fully interactive application workspace to our target user.
* *Previous Dependencies:* `ApiControllerModule`, `StreamingModule`, `ExportModule`.
* *Future Dependencies:* None (Absolute MVP Release Completion Block).

---

## 3. Engineering Execution Interrelation Matrix

This matrix maps out the complete structural dependency network across our logical monolith, highlighting how every module builds on previous layers.

```
+───────────────────────────────────────────────────────────────────────────────────+
| PHASE 1: CORE FOUNDATION MODULES                                                  |
|   [1.1 ConfigModule] ──► [1.2 LoggerModule] ──► [1.3 TransactionModule]           |
+──────────────────────────────┬───────────────────────────┬────────────────────────+
                               │                           │
                               ▼                           ▼
+──────────────────────────────┴───────────────────────────┴────────────────────────+
| PHASE 2: PERSISTENCE LAYERS                                                       |
|   [2.1 DatabaseModule (Drizzle Schema)]          [2.2 StorageModule (File Providers)]|
+──────────────────────────────┬───────────────────────────┬────────────────────────+
                               │                           │
                               ▼                           ▼
+──────────────────────────────┴───────────────────────────┴────────────────────────+
| PHASE 3: ACCESS & ACCOUNT SAFETY                                                  |
|   [3.1 AuthModule (Stateless JWT)]          ──►  [3.2 AuthorizationModule (Guards)]|
+──────────────────────────────┬────────────────────────────────────────────────────+
                               │
                               ▼
+──────────────────────────────┴────────────────────────────────────────────────────+
| PHASE 4: ASYNC TASK PROCESSING                                                    |
|   [4.1 QueueModule ( DB-backed Tasks & Locks )]                                   |
+──────────────────────────────┬────────────────────────────────────────────────────+
                               │
                               ▼
+──────────────────────────────┴────────────────────────────────────────────────────+
| PHASE 5: GROUNDING & INGESTION                                                    |
|   [5.1 ParsingModule] ──► [5.2 VectorCurationModule] ──► [5.3 SnapshotModule]      |
+───────────────────────────────────────────────────────────┬────────────────────────+
                                                            │
                                                            ▼
+───────────────────────────────────────────────────────────┴────────────────────────+
| PHASE 6: WORKSPACE AGGREGATES                                                     |
|   [6.1 ProjectWorkspaceModule] ──► [6.2 ProjectMemoryModule]                       |
|         │                                                                          |
|         └──► [6.3 ScriptStructureModule (Block Arrays)]                           |
+──────────────────────────────┬───────────────────────────┬────────────────────────+
                               │                           │
                               ▼                           ▼
+──────────────────────────────┴───────────────────────────┴────────────────────────+
| PHASE 7: REASONING ORCHESTRATION                                                  |
|   [7.1 PromptAssemblyModule] ──► [7.2 AiOrchestrationModule]                      |
|                                        │                                          |
|                                        ▼                                          |
|                                  [7.3 ComplianceValidationModule]                 |
+────────────────────────────────────────┬──────────────────────────────────────────+
                                         │
                                         ▼
+────────────────────────────────────────┴──────────────────────────────────────────+
| PHASE 8: NETWORK BORDERS & VIEWPORTS                                              |
|   [8.1 ApiControllerModule]   ──►  [8.2 StreamingModule (SSE buffer Gates)]       |
|         │                                    │                                    |
|         ├──► [8.3 ExportModule]              │                                    |
|         │                                    │                                    |
|         ▼                                    ▼                                    |
|   [8.4 ClientViewApp ( Vite + React Document Editor )]                            |
+───────────────────────────────────────────────────────────────────────────────────+

```

---

## 4. Architectural Boundary Validation

As your Chief Technology Officer, I have thoroughly verified the structural logic of this Engineering Execution Plan against our frozen architecture specifications:

1. **Dependency Verification:** Every module is mapped out sequentially behind its prerequisite layers, ensuring clean integration paths.
2. **Circular Reference Check:** The execution pipeline flows in a strict direction, fully avoiding circular dependencies.
3. **Boundary Integrity Preservation:** Business definitions (PRD/Domain) remain decoupled from infrastructure selections. Network components, storage selections, and ORM schemas live strictly in Phase 2, Phase 5, and Phase 8 of this EEP, matching the boundaries defined in the SDD.
4. **Immutability Shield Compliance:** Snapshot and block concurrency safety are mapped directly into early technical components.

This document stands ready as our frozen, production-grade template to guide the generation of all downstream Technical Design Documents (TDDs) and code construction tasks.

---

## 5. Official TDD Numbering Convention

To secure permanent stability across our entire engineering history, codebases, and tracking registries, the numbering schema for Technical Design Documents (TDDs) is locked to a non-shifting alphanumeric identifier configuration.

### 5.1 Syntax Structure Specification

Every generated document follows a fixed formatting footprint:

```
TDD-XXX

```

Where `XXX` represents a zero-padded, positive 3-digit integer incrementing sequentially from `001` upwards, tracking the exact initialization sequence defined by the dependency trees.

### 5.2 Immutability Rules

* **No Renumbering:** Once an ID code maps to an explicit system module or design target, it becomes **permanently unalterable**.
* **Divergence Resolution:** Introducing new components or intermediate sub-modules later must never shift existing digits downstream. New requirements append cleanly as a new sequential integer value at the end of the registry index.
* **Traceability Mapping:** The assigned `TDD-XXX` code must bind explicitly inside Git branch naming conventions, individual source code file header blocks, ADR dependencies, and all associated implementation notes to guarantee an uncorrupted audit trail.

---

## 6. Deliverables to TDD Master Mapping

The following mapping serves as the authoritative blueprint for engineering delivery. Technical Design Documents (TDDs) must be authored and finalized in this exact sequence to ensure strict compliance with our dependency architecture.

### Phase 1: Core Foundation & Cross-Cutting Concerns

* **TDD-001:** `Config Module Technical Specification`
* *Target:* Environment variable curation parsing pipelines, explicit Zod environment validation models, bootstrap termination conditions.


* **TDD-002:** `Logger Module Technical Specification`
* *Target:* NestJS Pino integration infrastructure, correlation ID global interceptors, structured single-line JSON formatting.


* **TDD-003:** `Transaction Module Technical Specification`
* *Target:* AsyncLocalStorage context routing, database engine runtime isolation logic, deferred domain event outbox caches.



### Phase 2: Core Persistence & Shared Storage Suite

* **TDD-004:** `Database Module Technical Specification`
* *Target:* Relational Drizzle schema definitions, composite indexing rules, explicit check constraints, transactional testing rollback suites.


* **TDD-005:** `Storage Module Technical Specification`
* *Target:* IFileStorageProvider interface definition, local development filesystem driver, production-ready S3/R2 abstract engine.



### Phase 3: Identity & Extensible Authorization

* **TDD-006:** `Auth Module Technical Specification`
* *Target:* Passwordless email OTP lifecycle flows, Google OAuth tokens interceptor layer, RS256 stateless asymmetric JWT signing.


* **TDD-007:** `Authorization Module Technical Specification`
* *Target:* CreatorIsolationGuard aggregate filter logic, resource security checks, cross-tenant isolation parameters.



### Phase 4: Asynchronous Task Engine

* **TDD-008:** `Queue Module Technical Specification`
* *Target:* IQueueService interface routing, decorator processing registers (`@ProcessTask`), PostgreSQL advisory locking hooks, DLQ error parsing logic.



### Phase 5: Knowledge Curation & RAG Layer

* **TDD-009:** `Parsing Module Technical Specification`
* *Target:* IDocumentParser adapter registration logic, specialized extension engines (PDF, DOCX, MD, HTML, EPUB, TXT).


* **TDD-010:** `Vector Curation Module Technical Specification`
* *Target:* IEmbeddingProvider interface orchestration, character chunk token bounds, pgvector HNSW search logic.


* **TDD-011:** `Snapshot Module Technical Specification`
* *Target:* Historical context replication processors, immutable snapshot chunk copying, parent index isolation rules.



### Phase 6: Project Workspace & State Machine

* **TDD-012:** `Project Workspace Module Technical Specification`
* *Target:* 9-stage State Machine lifecycle management, optimistic locking columns validations, structure persistence schemas.


* **TDD-013:** `Project Memory Module Technical Specification`
* *Target:* Append-only chronological logging mechanics, context summarization indexing data arrays, decision records capture.


* **TDD-014:** `Script Structure Module Technical Specification`
* *Target:* Script Block array sequence controls, isolation index caches, block privacy flag toggles (`is_locked`).



### Phase 7: AI Orchestration Subsystem

* **TDD-015:** `Prompt Assembly Module Technical Specification`
* *Target:* Centralized PromptTemplateRegistry configurations, token budget compression managers, ephemeral context text collectors.


* **TDD-016:** `AI Orchestration Module Technical Specification`
* *Target:* IAiProviderAdapter interface adapters setup, circuit breaker states, user failover recovery loops.


* **TDD-017:** `Compliance Validation Module Technical Specification`
* *Target:* Outbound response schema interceptors, Markdown validation matrices, inline citation verification logic.



### Phase 8: API Interfaces & Client Shell

* **TDD-018:** `API Controller Module Technical Specification`
* *Target:* Versioned Fastify router controllers (`/api/v1/*`), global envelope decorators, request idempotency processing engines.


* **TDD-019:** `Streaming Module Technical Specification`
* *Target:* Fastify Server-Sent Events (SSE) stream managers, chunk text buffered interceptors, stream dropout abort rollbacks.


* **TDD-020:** `Export Module Technical Specification`
* *Target:* Script block text aggregation collectors, plain text/Markdown compile engines, docx/pdf generation pipelines.


* **TDD-021:** `Client View App Technical Specification`
* *Target:* React interface UI application architecture, document-first text editor panel hooks, pull-based drawer assistant bindings.