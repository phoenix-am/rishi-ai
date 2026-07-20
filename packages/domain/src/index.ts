/**
 * Public API Entrypoint for the Rishi AI Domain Layer.
 * Exports pure domain entities, aggregate roots, value objects, domain events,
 * repository interfaces, domain services, and domain exceptions.
 */

// Re-export type-only interfaces and statuses
export type {
  ICreator,
  IProject,
  IScriptBlock,
  KnowledgeAssetStatus,
  WorkingContextStatus,
  ScriptBlockStatus,
  IWorkflowNode,
  IWorkflowEngine,
  IWorkflow,
  IWorkflowRun,
  IContentAsset,
  ContentAssetType,
} from "./entities.js";

// Providers
export type { ILLMProvider, ITTSProvider } from "./providers.js";

// Re-export concrete entities and aggregate roots
export {
  Creator,
  KnowledgeAsset,
  KnowledgeSnapshot,
  ProjectMemory,
  WorkingContext,
  ScriptBlock,
  Project,
  ContentAsset,
  WorkflowNodeType,
  Workflow,
  WorkflowRun,
} from "./entities.js";

// Value Objects
export { Email, SpeakingPacingInfo, ConfidenceScore, SourceCoverage } from "./value-objects.js";

// Exceptions
export {
  DomainException,
  EntityNotFoundException,
  InvalidStateTransitionException,
  ValidationException,
} from "./exceptions.js";

// Repositories (Types)
export type {
  ICreatorRepository,
  IProjectRepository,
  IKnowledgeAssetRepository,
  IScriptBlockRepository,
  IKnowledgeSnapshotRepository,
  IProjectMemoryRepository,
  IWorkflowRepository,
  IWorkflowRunRepository,
  IContentAssetRepository,
} from "./repositories.js";

// Domain Events (Base interface as type, concrete classes as values)
export type { IDomainEvent } from "./events.js";
export {
  ProjectCreatedDomainEvent,
  ProjectStateTransitionedDomainEvent,
  ScriptBlockUpdatedDomainEvent,
  KnowledgeAssetAddedDomainEvent,
  ContextDriftDetectedDomainEvent,
} from "./events.js";

// Domain Services
export { ProjectWorkflowService } from "./services.js";

// Repository Symbols
export {
  CREATOR_REPOSITORY,
  KNOWLEDGE_ASSET_REPOSITORY,
  KNOWLEDGE_SNAPSHOT_REPOSITORY,
  SCRIPT_BLOCK_REPOSITORY,
  PROJECT_MEMORY_REPOSITORY,
  PROJECT_REPOSITORY,
  CONTENT_ASSET_REPOSITORY,
  WORKFLOW_REPOSITORY,
  WORKFLOW_RUN_REPOSITORY,
} from "./repositories.js";
