import { Project, KnowledgeSnapshot, ProjectMemory } from "./entities.js";
import { ValidationException } from "./exceptions.js";
import { ContextDriftDetectedDomainEvent } from "./events.js";

/**
 * Domain Service that coordinates cross-aggregate workflow rules and operations.
 * Handles WorkingContext compilation and library drift detection.
 */
export class ProjectWorkflowService {
  /**
   * Compiles the WorkingContext text sequentially from project memories and attached snapshots.
   *
   * @param project - The target Project aggregate root.
   * @param memories - Historical memories associated with this project.
   * @param snapshots - Frozen snapshots attached to this project.
   * @returns The synthesized context string.
   * @throws ValidationException if the project is archived/deleted or context compilation parameters are invalid.
   */
  public compileWorkingContext(
    project: Project,
    memories: ProjectMemory[],
    snapshots: KnowledgeSnapshot[]
  ): string {
    if (project.deletedAt) {
      throw new ValidationException("Cannot compile working context for a deleted project.");
    }
    if (project.state === "archived") {
      throw new ValidationException("Cannot compile working context for an archived project.");
    }

    let compiledContent = `=== PROJECT WORKING CONTEXT: ${project.title} ===\n`;
    compiledContent += `State: ${project.state}\n\n`;

    // 1. Compile Snapshot references
    if (snapshots.length > 0) {
      compiledContent += "--- Source Document Snapshots ---\n";
      for (const snap of snapshots) {
        if (snap.projectId !== project.id) {
          throw new ValidationException(
            `Snapshot '${snap.id}' does not belong to Project '${project.id}'.`
          );
        }
        compiledContent += `Source: [${snap.title}] (Version: ${snap.capturedVersionId})\n`;
        compiledContent += `${snap.frozenContent}\n\n`;
      }
    }

    // 2. Compile relevant Project memories
    const relevantMemories = memories
      .filter((m) => m.projectId === project.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (relevantMemories.length > 0) {
      compiledContent += "--- Evolving Project Memories ---\n";
      for (const memory of relevantMemories) {
        compiledContent += `[Memory: ${memory.eventType}] (Recorded: ${memory.createdAt.toISOString()})\n`;
        compiledContent += `${JSON.stringify(memory.payload)}\n\n`;
      }
    }

    return compiledContent.trim();
  }

  /**
   * Evaluates if the project's frozen snapshots have drifted away from active library asset versions.
   * Raises a drift event on the project aggregate if a newer version is detected.
   *
   * @param project - The target Project aggregate root.
   * @param activeAssetVersions - Map of active asset ID to its current versionId in the library database.
   * @param correlationId - Tracking correlation.
   * @returns True if context drift is detected, false otherwise.
   */
  public detectContextDrift(
    project: Project,
    activeAssetVersions: Map<string, number>,
    correlationId: string
  ): boolean {
    let driftFound = false;
    const driftedAssetTitles: string[] = [];

    for (const snapshot of project.snapshots) {
      if (!snapshot.assetId) continue;

      const currentVersion = activeAssetVersions.get(snapshot.assetId);
      if (currentVersion !== undefined && currentVersion > snapshot.capturedVersionId) {
        driftFound = true;
        driftedAssetTitles.push(snapshot.title);
      }
    }

    if (driftFound) {
      // Emit ContextDriftDetectedDomainEvent on the aggregate root
      // Direct access is appropriate since the service acts as aggregate coordinator
      const event = new ContextDriftDetectedDomainEvent(project.id, correlationId, {
        reason: `Context drift detected. The following source assets have newer versions: ${driftedAssetTitles.join(", ")}`,
      });
      // Add event to project domain event list
      (project as any).addDomainEvent(event);
    }

    return driftFound;
  }
}
