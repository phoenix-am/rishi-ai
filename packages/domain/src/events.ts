import { randomUUID } from "crypto";

/**
 * Base contract defining a Domain Event representing an immutable past fact.
 */
export interface IDomainEvent {
  /**
   * Unique identifier of the specific event instance.
   */
  readonly eventId: string;

  /**
   * When the event was recorded.
   */
  readonly timestamp: Date;

  /**
   * Correlation ID propagating asynchronous lifecycle traces.
   */
  readonly correlationId: string;

  /**
   * Canonical event type (e.g. 'project.created').
   */
  readonly eventType: string;

  /**
   * ID of the Aggregate Root associated with this event.
   */
  readonly aggregateId: string;

  /**
   * Immutable payload carrying business details.
   */
  readonly payload: Record<string, any>;
}

/**
 * Emitted when a new project shell is initialized.
 */
export class ProjectCreatedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly eventType = "project.created";

  constructor(
    public readonly aggregateId: string,
    public readonly correlationId: string,
    public readonly payload: {
      readonly creatorId: string;
      readonly title: string;
      readonly state: string;
    }
  ) {
    this.eventId = randomUUID();
    this.timestamp = new Date();
    Object.freeze(this.payload);
    Object.freeze(this);
  }
}

/**
 * Emitted when a project successfully undergoes a sequential or backward stage transition.
 */
export class ProjectStateTransitionedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly eventType = "project.state_transitioned";

  constructor(
    public readonly aggregateId: string,
    public readonly correlationId: string,
    public readonly payload: {
      readonly oldState: string;
      readonly newState: string;
      readonly isBackstep: boolean;
    }
  ) {
    this.eventId = randomUUID();
    this.timestamp = new Date();
    Object.freeze(this.payload);
    Object.freeze(this);
  }
}

/**
 * Emitted when a script block nested inside the project aggregate has its content or state modified.
 */
export class ScriptBlockUpdatedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly eventType = "script_block.updated";

  constructor(
    public readonly aggregateId: string,
    public readonly correlationId: string,
    public readonly payload: {
      readonly blockId: string;
      readonly sortOrder: number;
      readonly isLocked: boolean;
      readonly title: string;
      readonly content: string;
    }
  ) {
    this.eventId = randomUUID();
    this.timestamp = new Date();
    Object.freeze(this.payload);
    Object.freeze(this);
  }
}

/**
 * Emitted when a knowledge snapshot is attached to the project.
 */
export class KnowledgeAssetAddedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly eventType = "knowledge_asset.added";

  constructor(
    public readonly aggregateId: string,
    public readonly correlationId: string,
    public readonly payload: {
      readonly assetId: string;
      readonly title: string;
      readonly storagePath: string;
    }
  ) {
    this.eventId = randomUUID();
    this.timestamp = new Date();
    Object.freeze(this.payload);
    Object.freeze(this);
  }
}

/**
 * Emitted when context drift check identifies outdated working contexts.
 */
export class ContextDriftDetectedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly timestamp: Date;
  public readonly eventType = "project.context_drift_detected";

  constructor(
    public readonly aggregateId: string,
    public readonly correlationId: string,
    public readonly payload: {
      readonly reason: string;
    }
  ) {
    this.eventId = randomUUID();
    this.timestamp = new Date();
    Object.freeze(this.payload);
    Object.freeze(this);
  }
}
