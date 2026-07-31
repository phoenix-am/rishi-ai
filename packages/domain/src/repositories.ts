import {
  Creator,
  Project,
  KnowledgeAsset,
  ScriptBlock,
  KnowledgeSnapshot,
  ProjectMemory,
  Workflow,
  WorkflowRun,
  ContentAsset,
  type ProjectState,
} from "./entities.js";

export const CREATOR_REPOSITORY = Symbol.for("CreatorRepository");
export const KNOWLEDGE_ASSET_REPOSITORY = Symbol.for("KnowledgeAssetRepository");
export const KNOWLEDGE_SNAPSHOT_REPOSITORY = Symbol.for("KnowledgeSnapshotRepository");
export const SCRIPT_BLOCK_REPOSITORY = Symbol.for("ScriptBlockRepository");
export const PROJECT_MEMORY_REPOSITORY = Symbol.for("ProjectMemoryRepository");
export const PROJECT_REPOSITORY = Symbol.for("ProjectRepository");
export const CONTENT_ASSET_REPOSITORY = Symbol.for("ContentAssetRepository");
export const WORKFLOW_REPOSITORY = Symbol.for("WorkflowRepository");
export const WORKFLOW_RUN_REPOSITORY = Symbol.for("WorkflowRunRepository");

/**
 * Interface contract for Creator persistence operations.
 */
export interface ICreatorRepository {
  /**
   * Resolves a creator by their unique ID.
   */
  findById(id: string): Promise<Creator | null>;

  /**
   * Resolves a creator by their unique handle.
   */
  findByHandle(handle: string): Promise<Creator | null>;

  /**
   * Saves the creator state (insert or update).
   */
  save(creator: Creator): Promise<void>;

  /**
   * Checks if a creator with the given ID exists.
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Interface contract for Project aggregate root persistence.
 */
export interface IProjectRepository {
  /**
   * Resolves a project aggregate by ID.
   */
  findById(id: string): Promise<Project | null>;

  /** Resolves one project only when it belongs to the selected workspace. */
  findByWorkspaceAndId(workspaceId: string, id: string): Promise<Project | null>;

  /** Lists one stable page of projects inside a workspace. */
  findByWorkspaceId(workspaceId: string, limit: number, offset: number): Promise<Project[]>;

  /** Counts projects inside a workspace for pagination. */
  countByWorkspaceId(workspaceId: string): Promise<number>;

  /**
   * Saves the project aggregate and captures transactional event queues.
   */
  save(project: Project): Promise<void>;

  /** Atomically transitions state when the persisted version still matches. */
  updateStateWithLock(
    projectId: string,
    workspaceId: string,
    targetState: ProjectState,
    previousState: Exclude<ProjectState, "archived"> | null,
    hasStateDrift: boolean,
    expectedVersion: number,
    updatedAt: Date
  ): Promise<Project | null>;

  /**
   * Checks if a project exists.
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Interface contract for ContentAsset persistence.
 */
export interface IContentAssetRepository {
  /**
   * Resolves a content asset by ID.
   */
  findById(id: string): Promise<ContentAsset | null>;

  /**
   * Resolves all content assets attached to a specific project.
   */
  findByProjectId(projectId: string): Promise<ContentAsset[]>;

  /**
   * Saves a content asset.
   */
  save(asset: ContentAsset): Promise<void>;

  /**
   * Checks if a content asset exists.
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Interface contract for KnowledgeAsset library documents persistence.
 */
export interface IKnowledgeAssetRepository {
  /**
   * Resolves a knowledge asset by ID.
   */
  findById(id: string): Promise<KnowledgeAsset | null>;

  /**
   * Saves the asset state.
   */
  save(asset: KnowledgeAsset): Promise<void>;

  /**
   * Checks if an asset exists.
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Interface contract for ScriptBlock segment persistence.
 */
export interface IScriptBlockRepository {
  /**
   * Resolves a specific script block.
   */
  findById(id: string): Promise<ScriptBlock | null>;

  /**
   * Resolves all script blocks associated with a specific project container.
   */
  findByProjectId(projectId: string): Promise<ScriptBlock[]>;

  /**
   * Saves a script block.
   */
  save(block: ScriptBlock): Promise<void>;

  /**
   * Atomically saves or updates a batch of script blocks.
   */
  saveMany(blocks: ScriptBlock[]): Promise<void>;
}

/**
 * Interface contract for KnowledgeSnapshot persistence.
 */
export interface IKnowledgeSnapshotRepository {
  /**
   * Resolves a specific snapshot.
   */
  findById(id: string): Promise<KnowledgeSnapshot | null>;

  /**
   * Resolves all snapshots attached to a specific project.
   */
  findByProjectId(projectId: string): Promise<KnowledgeSnapshot[]>;

  /** Resolves the one immutable snapshot link for a project and source asset. */
  findByProjectAsset(projectId: string, assetId: string): Promise<KnowledgeSnapshot | null>;

  /**
   * Saves a snapshot.
   */
  save(snapshot: KnowledgeSnapshot): Promise<void>;

  /** Removes a project-scoped snapshot link; snapshot content is never updated. */
  delete(projectId: string, snapshotId: string): Promise<boolean>;
}

/**
 * Interface contract for ProjectMemory persistence.
 */
export interface IProjectMemoryRepository {
  /**
   * Resolves all memory logs registered for a specific project.
   */
  findByProjectId(projectId: string): Promise<ProjectMemory[]>;

  /**
   * Persists a new memory log entry.
   */
  save(memory: ProjectMemory): Promise<void>;
}

/**
 * Interface contract for Workflow persistence.
 */
export interface IWorkflowRepository {
  /**
   * Resolves a workflow by ID.
   */
  findById(id: string): Promise<Workflow | null>;

  /**
   * Saves a workflow (insert or update).
   */
  save(workflow: Workflow): Promise<void>;

  /**
   * Deletes a workflow by ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if a workflow exists.
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Interface contract for WorkflowRun persistence.
 */
export interface IWorkflowRunRepository {
  /**
   * Resolves a workflow run by ID.
   */
  findById(id: string): Promise<WorkflowRun | null>;

  /**
   * Saves a workflow run state.
   */
  save(run: WorkflowRun): Promise<void>;

  /**
   * Checks if a workflow run exists.
   */
  exists(id: string): Promise<boolean>;
}
