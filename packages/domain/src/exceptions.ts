import { BaseAppException } from "@rishi/shared";

/**
 * Base class for all domain-related exceptions.
 * Exposes structured metadata for observability.
 */
export class DomainException extends BaseAppException {
  /**
   * Creates a new DomainException.
   *
   * @param message - Human-readable error message.
   * @param code - Machine-readable error code.
   * @param statusCode - HTTP status code mapping (defaults to 400).
   * @param metadata - Structured metadata related to the exception context.
   */
  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    public readonly metadata: Record<string, any> = {}
  ) {
    super(message, code, statusCode);
  }
}

/**
 * Thrown when an expected domain entity or aggregate root cannot be resolved.
 */
export class EntityNotFoundException extends DomainException {
  /**
   * Creates a new EntityNotFoundException.
   *
   * @param entityType - The type name of the missing entity.
   * @param entityId - The unique identifier of the missing entity.
   * @param metadata - Additional structured metadata.
   */
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    metadata: Record<string, any> = {}
  ) {
    super(`Entity '${entityType}' with ID '${entityId}' was not found.`, "ENTITY_NOT_FOUND", 404, {
      ...metadata,
      entityType,
      entityId,
    });
  }
}

/**
 * Thrown when an illegal state transition is attempted on an entity or aggregate root.
 */
export class InvalidStateTransitionException extends DomainException {
  /**
   * Creates a new InvalidStateTransitionException.
   *
   * @param entityType - The type name of the entity.
   * @param entityId - The unique identifier of the entity.
   * @param currentState - The current state of the entity.
   * @param targetState - The illegal target state attempted.
   * @param metadata - Additional structured metadata.
   */
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly currentState: string,
    public readonly targetState: string,
    metadata: Record<string, any> = {}
  ) {
    super(
      `Invalid state transition for '${entityType}' with ID '${entityId}' from '${currentState}' to '${targetState}'.`,
      "INVALID_STATE_TRANSITION",
      400,
      { ...metadata, entityType, entityId, currentState, targetState }
    );
  }
}

/**
 * Thrown when domain validation or invariant checking fails.
 */
export class ValidationException extends DomainException {
  /**
   * Creates a new ValidationException.
   *
   * @param message - General validation failure message.
   * @param validationErrors - List of specific validation failure details.
   * @param metadata - Additional structured metadata.
   */
  constructor(
    message: string,
    public readonly validationErrors: string[] = [],
    metadata: Record<string, any> = {}
  ) {
    super(message, "DOMAIN_VALIDATION_ERROR", 400, {
      ...metadata,
      validationErrors,
    });
  }
}
