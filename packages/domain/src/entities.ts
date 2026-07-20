import { InvalidStateTransitionException, ValidationException } from "./exceptions.js";

/**
 * Core interface for a Creator, consumed by other packages.
 */
export interface ICreator {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly handle: string;
  readonly bio: string | null;
  readonly avatarUrl: string | null;
  readonly createdAt: Date;
}

/**
 * Core interface for a Project, consumed by other packages.
 */
export interface IProject {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: string;
  readonly createdAt: Date;
}

export type ContentAssetType = "SCRIPT" | "AUDIO" | "VIDEO" | "IMAGE";

export interface IContentAsset {
  readonly id: string;
  readonly projectId: string;
  readonly workspaceId: string;
  readonly type: ContentAssetType;
  readonly contentUrl: string | null;
  readonly textContent: string | null;
  readonly createdAt: Date;
}

/**
 * Core interface for a ScriptBlock, consumed by other packages.
 */
export interface IScriptBlock {
  readonly id: string;
  readonly projectId: string;
  readonly sortOrder: number;
  readonly isLocked: boolean;
  readonly title: string;
  readonly content: string;
}

/**
 * Business resource entity encapsulating creator details.
 */
export class Creator implements ICreator {
  public readonly id: string;
  public readonly workspaceId: string;
  public readonly name: string;
  public readonly handle: string;
  public readonly bio: string | null;
  public readonly avatarUrl: string | null;
  public readonly createdAt: Date;

  constructor(
    id: string,
    workspaceId: string,
    name: string,
    handle: string,
    bio: string | null = null,
    avatarUrl: string | null = null,
    createdAt: Date = new Date()
  ) {
    if (!id || typeof id !== "string" || id.trim() === "") {
      throw new ValidationException("Creator ID must be a non-empty string.");
    }
    if (!workspaceId || typeof workspaceId !== "string" || workspaceId.trim() === "") {
      throw new ValidationException("Workspace ID must be a non-empty string.");
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new ValidationException("Creator Name must be a non-empty string.");
    }
    if (!handle || typeof handle !== "string" || handle.trim() === "") {
      throw new ValidationException("Creator Handle must be a non-empty string.");
    }
    this.id = id;
    this.workspaceId = workspaceId;
    this.name = name.trim();
    this.handle = handle.trim().toLowerCase();
    this.bio = bio ? bio.trim() : null;
    this.avatarUrl = avatarUrl ? avatarUrl.trim() : null;
    this.createdAt = createdAt;
  }
}

/**
 * Knowledge asset state representation.
 */
export type KnowledgeAssetStatus = "active" | "deprecated" | "deleted";

/**
 * Entity representing structural references, rules, or scripts inside the libraries.
 */
export class KnowledgeAsset {
  public readonly id: string;
  public readonly creatorId: string | null; // null represents platform-wide asset
  private _title: string;
  private _storagePath: string;
  private _versionId: number;
  private _status: KnowledgeAssetStatus;
  private _deletedAt: Date | null = null;

  constructor(
    id: string,
    creatorId: string | null,
    title: string,
    storagePath: string,
    versionId: number = 1,
    status: KnowledgeAssetStatus = "active",
    deletedAt: Date | null = null
  ) {
    if (!id) throw new ValidationException("Asset ID must be provided.");
    if (!title) throw new ValidationException("Asset Title cannot be empty.");
    if (!storagePath) throw new ValidationException("Asset Storage path cannot be empty.");

    this.id = id;
    this.creatorId = creatorId;
    this._title = title;
    this._storagePath = storagePath;
    this._versionId = versionId;
    this._status = status;
    this._deletedAt = deletedAt;
  }

  public get title(): string {
    return this._title;
  }
  public get storagePath(): string {
    return this._storagePath;
  }
  public get versionId(): number {
    return this._versionId;
  }
  public get status(): KnowledgeAssetStatus {
    return this._status;
  }
  public get deletedAt(): Date | null {
    return this._deletedAt;
  }

  /**
   * Deprecates the asset, making it hidden from new configurations.
   */
  public deprecate(): void {
    if (this._status === "deleted") {
      throw new InvalidStateTransitionException(
        "KnowledgeAsset",
        this.id,
        this._status,
        "deprecated"
      );
    }
    this._status = "deprecated";
  }

  /**
   * Soft-deletes the asset from creator search indexes.
   */
  public delete(): void {
    if (this._status === "deleted") {
      throw new InvalidStateTransitionException("KnowledgeAsset", this.id, this._status, "deleted");
    }
    this._status = "deleted";
    this._deletedAt = new Date();
  }

  /**
   * Increments the asset version when edits occur.
   */
  public updateAssetDetails(title: string, storagePath: string): void {
    if (this._status !== "active") {
      throw new ValidationException(`Cannot update asset in '${this._status}' state.`);
    }
    this._title = title;
    this._storagePath = storagePath;
    this._versionId += 1;
  }
}

/**
 * Immutable value object capture of a library asset mapped to a project execution block.
 */
export class KnowledgeSnapshot {
  public readonly id: string;
  public readonly projectId: string;
  public readonly assetId: string | null;
  public readonly title: string;
  public readonly capturedVersionId: number;
  public readonly frozenContent: string;
  public readonly attachedAt: Date;

  constructor(
    id: string,
    projectId: string,
    assetId: string | null,
    title: string,
    capturedVersionId: number,
    frozenContent: string,
    attachedAt: Date = new Date()
  ) {
    this.id = id;
    this.projectId = projectId;
    this.assetId = assetId;
    this.title = title;
    this.capturedVersionId = capturedVersionId;
    this.frozenContent = frozenContent;
    this.attachedAt = attachedAt;

    // Enforce deep immutability at runtime
    Object.freeze(this);
  }
}

/**
 * Entity representing logs inside project workflow memory.
 */
export class ProjectMemory {
  public readonly id: string;
  public readonly projectId: string;
  public readonly eventType: string;
  public readonly payload: Record<string, any>;
  public readonly createdAt: Date;

  constructor(
    id: string,
    projectId: string,
    eventType: string,
    payload: Record<string, any>,
    createdAt: Date = new Date()
  ) {
    this.id = id;
    this.projectId = projectId;
    this.eventType = eventType;
    this.payload = Object.freeze({ ...payload });
    this.createdAt = createdAt;
  }
}

/**
 * Working context status representation.
 */
export type WorkingContextStatus = "empty" | "valid" | "stale";

/**
 * Entity representing highly compressed synthesized context text in volatile memory.
 */
export class WorkingContext {
  public readonly id: string;
  public readonly projectId: string;
  private _compressedText: string;
  private _generatedAt: Date;
  private _status: WorkingContextStatus;

  constructor(
    id: string,
    projectId: string,
    compressedText: string,
    generatedAt: Date = new Date(),
    status: WorkingContextStatus = "empty"
  ) {
    this.id = id;
    this.projectId = projectId;
    this._compressedText = compressedText;
    this._generatedAt = generatedAt;
    this._status = status;
  }

  public get compressedText(): string {
    return this._compressedText;
  }
  public get generatedAt(): Date {
    return this._generatedAt;
  }
  public get status(): WorkingContextStatus {
    return this._status;
  }

  /**
   * Sets status to stale, triggering context drift warnings.
   */
  public markStale(): void {
    this._status = "stale";
  }

  /**
   * Overwrites/Recompiles the compressed context payload.
   */
  public recompile(compressedText: string): void {
    this._compressedText = compressedText;
    this._generatedAt = new Date();
    this._status = "valid";
  }
}

/**
 * Script block status derived types.
 */
export type ScriptBlockStatus = "draft" | "generated" | "locked" | "unlocked";

/**
 * Entity representing an ordered, editable chapter script chunk.
 */
export class ScriptBlock implements IScriptBlock {
  public readonly id: string;
  public readonly projectId: string;
  private _sortOrder: number;
  private _isLocked: boolean;
  private _title: string;
  private _content: string;

  constructor(
    id: string,
    projectId: string,
    sortOrder: number,
    isLocked: boolean,
    title: string,
    content: string
  ) {
    this.id = id;
    this.projectId = projectId;
    this._sortOrder = sortOrder;
    this._isLocked = isLocked;
    this._title = title;
    this._content = content;
  }

  public get sortOrder(): number {
    return this._sortOrder;
  }
  public get isLocked(): boolean {
    return this._isLocked;
  }
  public get title(): string {
    return this._title;
  }
  public get content(): string {
    return this._content;
  }

  /**
   * Derived logical status based on state combinations.
   */
  public get status(): ScriptBlockStatus {
    if (this._isLocked) return "locked";
    if (!this._content || this._content.trim() === "") return "draft";
    return "unlocked";
  }

  public lock(): void {
    this._isLocked = true;
  }

  public unlock(): void {
    this._isLocked = false;
  }

  public updateContent(content: string): void {
    if (this._isLocked) {
      throw new ValidationException(`Cannot update locked script block: '${this.id}'`);
    }
    this._content = content;
  }

  public updateTitle(title: string): void {
    if (this._isLocked) {
      throw new ValidationException(`Cannot update title of locked script block: '${this.id}'`);
    }
    this._title = title;
  }

  public updateSortOrder(sortOrder: number): void {
    this._sortOrder = sortOrder;
  }
}

/**
 * Project pipeline workflow states.
 */
export type ProjectState =
  | "draft"
  | "research"
  | "knowledge_organized"
  | "working_context_generated"
  | "outline_generated"
  | "script_generated"
  | "review"
  | "exported"
  | "archived";

/**
 * The 9-stage sequence.
 */

/**
 * Aggregate Root governing the content production lifecycle and its aggregates.
 */
export class Project implements IProject {
  public readonly id: string;
  public readonly workspaceId: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly status: string;
  public readonly createdAt: Date;

  constructor(
    id: string,
    workspaceId: string,
    name: string,
    description: string | null = null,
    status: string = "draft",
    createdAt: Date = new Date()
  ) {
    if (!id) throw new ValidationException("Project ID is required.");
    if (!workspaceId) throw new ValidationException("Workspace ID is required.");
    if (!name) throw new ValidationException("Project Name is required.");

    this.id = id;
    this.workspaceId = workspaceId;
    this.name = name;
    this.description = description;
    this.status = status;
    this.createdAt = createdAt;
  }
}

export class ContentAsset implements IContentAsset {
  public readonly id: string;
  public readonly projectId: string;
  public readonly workspaceId: string;
  public readonly type: ContentAssetType;
  public readonly contentUrl: string | null;
  public readonly textContent: string | null;
  public readonly createdAt: Date;

  constructor(
    id: string,
    projectId: string,
    workspaceId: string,
    type: ContentAssetType,
    contentUrl: string | null = null,
    textContent: string | null = null,
    createdAt: Date = new Date()
  ) {
    if (!id) throw new ValidationException("Content Asset ID is required.");
    if (!projectId) throw new ValidationException("Project ID is required.");
    if (!workspaceId) throw new ValidationException("Workspace ID is required.");
    if (!type) throw new ValidationException("Content Asset Type is required.");

    this.id = id;
    this.projectId = projectId;
    this.workspaceId = workspaceId;
    this.type = type;
    this.contentUrl = contentUrl;
    this.textContent = textContent;
    this.createdAt = createdAt;
  }
}

/**
 * Enums representing the supported types of workflow nodes.
 */
export enum WorkflowNodeType {
  LLM_PROMPT = "LLM_PROMPT",
  TEXT_TO_SPEECH = "TEXT_TO_SPEECH",
  MERGE_VIDEO = "MERGE_VIDEO",
}

/**
 * Interface contract for a single node inside a workflow definition graph.
 */
export interface IWorkflowNode {
  readonly id: string;
  readonly type: WorkflowNodeType | string;
  readonly name: string;
  readonly config: Record<string, any>;
  readonly nextNodeIds: string[];
}

/**
 * Abstract interface for the workflow execution engine.
 */
export interface IWorkflowEngine {
  execute(run: IWorkflowRun): Promise<void>;
}

/**
 * Core interface for a Workflow definition.
 */
export interface IWorkflow {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly description: string | null;
  readonly triggerType: string;
  readonly definition: {
    nodes: IWorkflowNode[];
    edges: Array<{ from: string; to: string }>;
  };
  readonly status: string;
  readonly createdAt: Date;
}

/**
 * Core interface for a Workflow Run execution instance.
 */
export interface IWorkflowRun {
  readonly id: string;
  readonly workflowId: string;
  readonly workspaceId: string;
  readonly status: string;
  readonly state: {
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    [key: string]: any;
  };
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

/**
 * Domain entity representing a Workflow graph definition.
 */
export class Workflow implements IWorkflow {
  public readonly id: string;
  public readonly workspaceId: string;
  public readonly name: string;
  public readonly description: string | null;
  public readonly triggerType: string;
  public readonly definition: {
    nodes: IWorkflowNode[];
    edges: Array<{ from: string; to: string }>;
  };
  public readonly status: string;
  public readonly createdAt: Date;

  constructor(
    id: string,
    workspaceId: string,
    name: string,
    description: string | null,
    triggerType: string,
    definition: { nodes: IWorkflowNode[]; edges: Array<{ from: string; to: string }> },
    status: string = "draft",
    createdAt: Date = new Date()
  ) {
    if (!id || typeof id !== "string" || id.trim() === "") {
      throw new ValidationException("Workflow ID must be a non-empty string.");
    }
    if (!workspaceId || typeof workspaceId !== "string" || workspaceId.trim() === "") {
      throw new ValidationException("Workspace ID must be a non-empty string.");
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      throw new ValidationException("Workflow Name must be a non-empty string.");
    }
    if (!triggerType || typeof triggerType !== "string" || triggerType.trim() === "") {
      throw new ValidationException("Workflow Trigger Type must be a non-empty string.");
    }
    if (!definition || typeof definition !== "object") {
      throw new ValidationException("Workflow Definition must be a valid object.");
    }
    if (!Array.isArray(definition.nodes)) {
      throw new ValidationException("Workflow definition must contain a list of nodes.");
    }
    if (!Array.isArray(definition.edges)) {
      throw new ValidationException("Workflow definition must contain a list of edges.");
    }
    if (!status || typeof status !== "string" || status.trim() === "") {
      throw new ValidationException("Workflow Status must be a non-empty string.");
    }

    this.id = id;
    this.workspaceId = workspaceId;
    this.name = name.trim();
    this.description = description ? description.trim() : null;
    this.triggerType = triggerType.trim();
    this.definition = definition;
    this.status = status.trim();
    this.createdAt = createdAt;
  }
}

/**
 * Domain entity representing an execution instance of a Workflow.
 */
export class WorkflowRun implements IWorkflowRun {
  public readonly id: string;
  public readonly workflowId: string;
  public readonly workspaceId: string;
  private _status: string;
  private _state: {
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    [key: string]: any;
  };
  public readonly startedAt: Date;
  private _completedAt: Date | null;

  constructor(
    id: string,
    workflowId: string,
    workspaceId: string,
    status: string = "PENDING",
    state: { inputs: Record<string, any>; outputs: Record<string, any>; [key: string]: any } = {
      inputs: {},
      outputs: {},
    },
    startedAt: Date = new Date(),
    completedAt: Date | null = null
  ) {
    if (!id || typeof id !== "string" || id.trim() === "") {
      throw new ValidationException("WorkflowRun ID must be a non-empty string.");
    }
    if (!workflowId || typeof workflowId !== "string" || workflowId.trim() === "") {
      throw new ValidationException("Workflow ID must be a non-empty string.");
    }
    if (!workspaceId || typeof workspaceId !== "string" || workspaceId.trim() === "") {
      throw new ValidationException("Workspace ID must be a non-empty string.");
    }
    if (!status || typeof status !== "string" || status.trim() === "") {
      throw new ValidationException("WorkflowRun Status must be a non-empty string.");
    }
    if (!state || typeof state !== "object" || !state.inputs || !state.outputs) {
      throw new ValidationException("WorkflowRun State must be an object with inputs and outputs.");
    }

    this.id = id;
    this.workflowId = workflowId;
    this.workspaceId = workspaceId;
    this._status = status.trim();
    this._state = state;
    this.startedAt = startedAt;
    this._completedAt = completedAt;
  }

  public get status(): string {
    return this._status;
  }

  public get state(): {
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    [key: string]: any;
  } {
    return this._state;
  }

  public get completedAt(): Date | null {
    return this._completedAt;
  }

  /**
   * Transition the workflow run status to RUNNING.
   */
  public start(): void {
    if (this._status !== "PENDING") {
      throw new InvalidStateTransitionException("WorkflowRun", this.id, this._status, "RUNNING");
    }
    this._status = "RUNNING";
  }

  /**
   * Transition the workflow run status to COMPLETED and save outputs.
   */
  public complete(outputs: Record<string, any>): void {
    if (this._status !== "RUNNING") {
      throw new InvalidStateTransitionException("WorkflowRun", this.id, this._status, "COMPLETED");
    }
    this._status = "COMPLETED";
    this._state = {
      ...this._state,
      outputs,
    };
    this._completedAt = new Date();
  }

  /**
   * Transition the workflow run status to FAILED and record final failure state.
   */
  public fail(outputs: Record<string, any>): void {
    if (this._status !== "RUNNING" && this._status !== "PENDING") {
      throw new InvalidStateTransitionException("WorkflowRun", this.id, this._status, "FAILED");
    }
    this._status = "FAILED";
    this._state = {
      ...this._state,
      outputs,
    };
    this._completedAt = new Date();
  }
}
