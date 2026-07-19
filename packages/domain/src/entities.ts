import { InvalidStateTransitionException, ValidationException } from "./exceptions.js";
import {
  IDomainEvent,
  ProjectStateTransitionedDomainEvent,
  ScriptBlockUpdatedDomainEvent,
  KnowledgeAssetAddedDomainEvent,
} from "./events.js";

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
  readonly creatorId: string;
  readonly title: string;
  readonly state: string;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
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
const PROJECT_STATE_SEQUENCE: ProjectState[] = [
  "draft",
  "research",
  "knowledge_organized",
  "working_context_generated",
  "outline_generated",
  "script_generated",
  "review",
  "exported",
  "archived",
];

/**
 * Aggregate Root governing the content production lifecycle and its aggregates.
 */
export class Project implements IProject {
  public readonly id: string;
  public readonly creatorId: string;
  private _title: string;
  private _state: ProjectState;
  private _version: number;
  public readonly createdAt: Date;
  private _updatedAt: Date;
  private _deletedAt: Date | null = null;

  // Aggregate boundary collections
  private readonly _scriptBlocks: ScriptBlock[] = [];
  private readonly _snapshots: KnowledgeSnapshot[] = [];
  private _workingContext: WorkingContext | null = null;

  // State restoration
  private _previousState: ProjectState | null = null;
  private _hasStateDrift: boolean = false;

  // Domain events buffer
  private readonly _domainEvents: IDomainEvent[] = [];

  constructor(
    id: string,
    creatorId: string,
    title: string,
    state: ProjectState = "draft",
    version: number = 1,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    deletedAt: Date | null = null,
    previousState: ProjectState | null = null,
    hasStateDrift: boolean = false
  ) {
    if (!id) throw new ValidationException("Project ID is required.");
    if (!creatorId) throw new ValidationException("Creator ID is required.");
    if (!title) throw new ValidationException("Project Title is required.");

    this.id = id;
    this.creatorId = creatorId;
    this._title = title;
    this._state = state;
    this._version = version;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._deletedAt = deletedAt;
    this._previousState = previousState;
    this._hasStateDrift = hasStateDrift;
  }

  public get title(): string {
    return this._title;
  }
  public get state(): ProjectState {
    return this._state;
  }
  public get version(): number {
    return this._version;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }
  public get deletedAt(): Date | null {
    return this._deletedAt;
  }
  public get scriptBlocks(): readonly ScriptBlock[] {
    return this._scriptBlocks;
  }
  public get snapshots(): readonly KnowledgeSnapshot[] {
    return this._snapshots;
  }
  public get workingContext(): WorkingContext | null {
    return this._workingContext;
  }
  public get previousState(): ProjectState | null {
    return this._previousState;
  }
  public get hasStateDrift(): boolean {
    return this._hasStateDrift;
  }
  public get domainEvents(): readonly IDomainEvent[] {
    return this._domainEvents;
  }

  public clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  private addDomainEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Asserts the project aggregate has not been archived or deleted.
   */
  private assertActive(): void {
    if (this._deletedAt) {
      throw new ValidationException(`Project '${this.id}' is deleted.`);
    }
    if (this._state === "archived") {
      throw new InvalidStateTransitionException(
        "Project",
        this.id,
        this._state,
        "active_operation"
      );
    }
  }

  /**
   * Transitions the project to the target state validating sequence boundaries.
   *
   * @param targetState - State to transition to.
   * @param correlationId - Tracking correlation.
   */
  public transitionTo(targetState: ProjectState, correlationId: string): void {
    if (this._deletedAt) {
      throw new ValidationException(`Cannot transition deleted project: '${this.id}'`);
    }

    if (this._state === targetState) {
      return;
    }

    const currentIndex = PROJECT_STATE_SEQUENCE.indexOf(this._state);
    const targetIndex = PROJECT_STATE_SEQUENCE.indexOf(targetState);

    // Archiving is allowed from any active stage
    if (targetState === "archived") {
      this._previousState = this._state;
      const oldState = this._state;
      this._state = "archived";
      this._updatedAt = new Date();
      this._version += 1;
      this.addDomainEvent(
        new ProjectStateTransitionedDomainEvent(this.id, correlationId, {
          oldState,
          newState: "archived",
          isBackstep: false,
        })
      );
      return;
    }

    // Unarchiving restores the exact prior state
    if (this._state === "archived") {
      const restoreState = this._previousState || "draft";
      this._state = restoreState;
      this._previousState = null;
      this._updatedAt = new Date();
      this._version += 1;
      this.addDomainEvent(
        new ProjectStateTransitionedDomainEvent(this.id, correlationId, {
          oldState: "archived",
          newState: restoreState,
          isBackstep: false,
        })
      );
      return;
    }

    // Forward Step: must go to the immediate next state
    if (targetIndex === currentIndex + 1) {
      const oldState = this._state;
      this._state = targetState;
      this._updatedAt = new Date();
      this._version += 1;
      this.addDomainEvent(
        new ProjectStateTransitionedDomainEvent(this.id, correlationId, {
          oldState,
          newState: targetState,
          isBackstep: false,
        })
      );
      return;
    }

    // Backward Step: allowed to go to any previously completed index
    if (targetIndex < currentIndex) {
      const oldState = this._state;
      this._state = targetState;
      this._hasStateDrift = true;
      this._updatedAt = new Date();
      this._version += 1;
      this.addDomainEvent(
        new ProjectStateTransitionedDomainEvent(this.id, correlationId, {
          oldState,
          newState: targetState,
          isBackstep: true,
        })
      );
      return;
    }

    // Any other transition is illegal (e.g. jumping forward bypass stages)
    throw new InvalidStateTransitionException("Project", this.id, this._state, targetState);
  }

  /**
   * Initializes working context state inside aggregate.
   */
  public initializeWorkingContext(context: WorkingContext): void {
    this.assertActive();
    if (context.projectId !== this.id) {
      throw new ValidationException("Working context does not belong to this project.");
    }
    this._workingContext = context;
  }

  /**
   * Recompiles the working context content, clearing state drift warnings.
   */
  public recompileWorkingContext(compressedText: string): void {
    this.assertActive();
    if (!this._workingContext) {
      throw new ValidationException("Working context is not initialized.");
    }
    this._workingContext.recompile(compressedText);
    this._hasStateDrift = false;
    this._updatedAt = new Date();
  }

  /**
   * Soft deletes the project aggregate.
   */
  public softDelete(): void {
    this._deletedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Adds a new script block entity to the project.
   */
  public addScriptBlock(block: ScriptBlock, correlationId: string): void {
    this.assertActive();
    if (block.projectId !== this.id) {
      throw new ValidationException("Script block does not belong to this project.");
    }
    if (this._scriptBlocks.some((b) => b.id === block.id)) {
      throw new ValidationException(`Script block with ID '${block.id}' already exists.`);
    }

    this._scriptBlocks.push(block);
    this._updatedAt = new Date();
    this._version += 1;

    // Sorting script blocks by sortOrder
    this._scriptBlocks.sort((a, b) => a.sortOrder - b.sortOrder);

    this.addDomainEvent(
      new ScriptBlockUpdatedDomainEvent(this.id, correlationId, {
        blockId: block.id,
        sortOrder: block.sortOrder,
        isLocked: block.isLocked,
        title: block.title,
        content: block.content,
      })
    );
  }

  /**
   * Updates an existing script block's content, asserting lock safety.
   */
  public updateScriptBlockContent(blockId: string, content: string, correlationId: string): void {
    this.assertActive();
    const block = this._scriptBlocks.find((b) => b.id === blockId);
    if (!block) {
      throw new ValidationException(`Script block '${blockId}' not found in project.`);
    }

    block.updateContent(content);

    // Set context drift if updating script content after context generation
    const stateIndex = PROJECT_STATE_SEQUENCE.indexOf(this._state);
    const generatedIndex = PROJECT_STATE_SEQUENCE.indexOf("working_context_generated");
    if (stateIndex >= generatedIndex) {
      this._hasStateDrift = true;
    }

    this._updatedAt = new Date();
    this._version += 1;

    this.addDomainEvent(
      new ScriptBlockUpdatedDomainEvent(this.id, correlationId, {
        blockId: block.id,
        sortOrder: block.sortOrder,
        isLocked: block.isLocked,
        title: block.title,
        content: block.content,
      })
    );
  }

  /**
   * Updates an existing script block's title.
   */
  public updateScriptBlockTitle(blockId: string, title: string, correlationId: string): void {
    this.assertActive();
    const block = this._scriptBlocks.find((b) => b.id === blockId);
    if (!block) {
      throw new ValidationException(`Script block '${blockId}' not found in project.`);
    }

    block.updateTitle(title);
    this._updatedAt = new Date();
    this._version += 1;

    this.addDomainEvent(
      new ScriptBlockUpdatedDomainEvent(this.id, correlationId, {
        blockId: block.id,
        sortOrder: block.sortOrder,
        isLocked: block.isLocked,
        title: block.title,
        content: block.content,
      })
    );
  }

  /**
   * Locks a specific script block from subsequent AI mutations.
   */
  public lockScriptBlock(blockId: string, correlationId: string): void {
    this.assertActive();
    const block = this._scriptBlocks.find((b) => b.id === blockId);
    if (!block) {
      throw new ValidationException(`Script block '${blockId}' not found in project.`);
    }
    block.lock();
    this._updatedAt = new Date();
    this._version += 1;

    this.addDomainEvent(
      new ScriptBlockUpdatedDomainEvent(this.id, correlationId, {
        blockId: block.id,
        sortOrder: block.sortOrder,
        isLocked: block.isLocked,
        title: block.title,
        content: block.content,
      })
    );
  }

  /**
   * Unlocks a specific script block.
   */
  public unlockScriptBlock(blockId: string, correlationId: string): void {
    this.assertActive();
    const block = this._scriptBlocks.find((b) => b.id === blockId);
    if (!block) {
      throw new ValidationException(`Script block '${blockId}' not found in project.`);
    }
    block.unlock();
    this._updatedAt = new Date();
    this._version += 1;

    this.addDomainEvent(
      new ScriptBlockUpdatedDomainEvent(this.id, correlationId, {
        blockId: block.id,
        sortOrder: block.sortOrder,
        isLocked: block.isLocked,
        title: block.title,
        content: block.content,
      })
    );
  }

  /**
   * Reorders the script blocks array according to a list of IDs.
   */
  public reorderScriptBlocks(blockIds: string[], correlationId: string): void {
    this.assertActive();
    if (blockIds.length !== this._scriptBlocks.length) {
      throw new ValidationException("Reorder array length does not match project blocks count.");
    }

    // Verify all IDs correspond to our script blocks
    const ourIds = new Set(this._scriptBlocks.map((b) => b.id));
    for (const id of blockIds) {
      if (!ourIds.has(id)) {
        throw new ValidationException(
          `Script block ID '${id}' is not associated with this project.`
        );
      }
    }

    // Reassign sort orders
    blockIds.forEach((id, index) => {
      const block = this._scriptBlocks.find((b) => b.id === id)!;
      block.updateSortOrder(index);
    });

    // Re-sort array
    this._scriptBlocks.sort((a, b) => a.sortOrder - b.sortOrder);
    this._updatedAt = new Date();
    this._version += 1;

    // Emit event for each block to capture re-sorted index
    for (const block of this._scriptBlocks) {
      this.addDomainEvent(
        new ScriptBlockUpdatedDomainEvent(this.id, correlationId, {
          blockId: block.id,
          sortOrder: block.sortOrder,
          isLocked: block.isLocked,
          title: block.title,
          content: block.content,
        })
      );
    }
  }

  /**
   * Attaches a deep frozen KnowledgeSnapshot to the project container.
   */
  public attachSnapshot(snapshot: KnowledgeSnapshot, correlationId: string): void {
    this.assertActive();
    if (snapshot.projectId !== this.id) {
      throw new ValidationException("Snapshot does not belong to this project.");
    }
    if (this._snapshots.some((s) => s.id === snapshot.id)) {
      throw new ValidationException(`Snapshot with ID '${snapshot.id}' already attached.`);
    }

    this._snapshots.push(snapshot);
    this._hasStateDrift = true;
    this._updatedAt = new Date();
    this._version += 1;

    this.addDomainEvent(
      new KnowledgeAssetAddedDomainEvent(this.id, correlationId, {
        assetId: snapshot.assetId || "unknown_or_deleted",
        title: snapshot.title,
        storagePath: "snapshot_frozen_storage",
      })
    );
  }

  /**
   * Hydrates the project scriptBlocks from database retrieval.
   * Internal hydration methods do not trigger domain events or mark state drift.
   */
  public hydrateScriptBlocks(blocks: ScriptBlock[]): void {
    this._scriptBlocks.length = 0;
    for (const block of blocks) {
      if (block.projectId !== this.id) {
        throw new ValidationException("Script block does not belong to this project.");
      }
      this._scriptBlocks.push(block);
    }
    this._scriptBlocks.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Hydrates snapshots from database retrieval.
   */
  public hydrateSnapshots(snapshots: KnowledgeSnapshot[]): void {
    this._snapshots.length = 0;
    for (const snap of snapshots) {
      if (snap.projectId !== this.id) {
        throw new ValidationException("Snapshot does not belong to this project.");
      }
      this._snapshots.push(snap);
    }
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
