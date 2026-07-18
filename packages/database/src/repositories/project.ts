import { IProjectRepository, Project } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { projects, scriptBlocks, knowledgeSnapshots } from "../schema/index.js";
import { ProjectMapper } from "../mappers.js";
import { eq, and, isNull, inArray } from "drizzle-orm";

/**
 * Thrown when database operations fail or encounter data integrity violations.
 */
export class PersistenceException extends Error {
  constructor(message: string) {
    super(`[Persistence Error] ${message}`);
    this.name = "PersistenceException";
  }
}

/**
 * Thrown when an optimistic concurrency check fails.
 */
export class OptimisticLockingException extends PersistenceException {
  constructor(entityId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Concurrent update detected on Project '${entityId}'. Expected version: ${expectedVersion}, but found version: ${actualVersion} in database.`
    );
    this.name = "OptimisticLockingException";
  }
}

/**
 * Project aggregate root persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleProjectRepository implements IProjectRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves a project aggregate root by ID, eagerly fetching script blocks and snapshots.
   * Filters out soft-deleted records by default.
   */
  public async findById(
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<Project | null> {
    const filter = options?.includeDeleted
      ? eq(projects.id, id)
      : and(eq(projects.id, id), isNull(projects.deletedAt));

    // 1. Fetch project row
    const projectRows = await this.dbService.client.select().from(projects).where(filter).limit(1);

    if (projectRows.length === 0) return null;
    const projectRow = projectRows[0]!;

    // 2. Fetch associated script blocks
    const blockRows = await this.dbService.client
      .select()
      .from(scriptBlocks)
      .where(eq(scriptBlocks.projectId, id));

    // 3. Fetch associated snapshots
    const snapshotRows = await this.dbService.client
      .select()
      .from(knowledgeSnapshots)
      .where(eq(knowledgeSnapshots.projectId, id));

    // 4. Validate reconstruction invariants to fail fast on inconsistencies
    const sortOrders = new Set<number>();
    for (const block of blockRows) {
      if (block.projectId !== id) {
        throw new PersistenceException(
          `Data corruption: ScriptBlock '${block.id}' belongs to Project '${block.projectId}' instead of '${id}'.`
        );
      }
      if (sortOrders.has(block.sortOrder)) {
        throw new PersistenceException(
          `Data corruption: Duplicate sortOrder '${block.sortOrder}' detected in project script blocks.`
        );
      }
      sortOrders.add(block.sortOrder);
    }

    for (const snap of snapshotRows) {
      if (snap.projectId !== id) {
        throw new PersistenceException(
          `Data corruption: Snapshot '${snap.id}' belongs to Project '${snap.projectId}' instead of '${id}'.`
        );
      }
    }

    // 5. Reconstruct aggregate
    return ProjectMapper.toDomain(projectRow, blockRows, snapshotRows);
  }

  /**
   * Saves the complete project aggregate state.
   * Performs optimistic concurrency checks and collection synchronization.
   */
  public async save(project: Project): Promise<void> {
    const data = ProjectMapper.toPersistence(project);

    // 1. Fetch current database record to check existence and version
    const existingRows = await this.dbService.client
      .select({ version: projects.version })
      .from(projects)
      .where(eq(projects.id, project.id))
      .limit(1);

    if (existingRows.length === 0) {
      // Aggregate does not exist -> Insert root
      await this.dbService.client.insert(projects).values(data);
    } else {
      // Aggregate exists -> Verify optimistic lock version matches
      const dbVersion = existingRows[0]!.version;
      const expectedOldVersion = project.version - 1;

      if (dbVersion !== expectedOldVersion) {
        throw new OptimisticLockingException(project.id, expectedOldVersion, dbVersion);
      }

      // Update root and check rows affected
      const updateResult = await this.dbService.client
        .update(projects)
        .set({
          title: data.title,
          state: data.state,
          version: data.version,
          updatedAt: new Date(),
          deletedAt: data.deletedAt,
          previousState: data.previousState,
          hasStateDrift: data.hasStateDrift,
        })
        .where(and(eq(projects.id, project.id), eq(projects.version, dbVersion)));

      // Note: Node-postgres returns rowCount, check for safety
      if (updateResult.rowCount === 0) {
        throw new OptimisticLockingException(project.id, expectedOldVersion, dbVersion);
      }
    }

    // 2. Synchronize Child Collection: ScriptBlocks
    const dbBlocks = await this.dbService.client
      .select({ id: scriptBlocks.id })
      .from(scriptBlocks)
      .where(eq(scriptBlocks.projectId, project.id));

    const aggregateBlockIds = new Set(project.scriptBlocks.map((b) => b.id));
    const dbBlockIds = dbBlocks.map((b) => b.id);

    // A. Delete removed children
    const removedIds = dbBlockIds.filter((id) => !aggregateBlockIds.has(id));
    if (removedIds.length > 0) {
      await this.dbService.client.delete(scriptBlocks).where(inArray(scriptBlocks.id, removedIds));
    }

    // B. Upsert remaining script blocks
    for (const block of project.scriptBlocks) {
      await this.dbService.client
        .insert(scriptBlocks)
        .values({
          id: block.id,
          projectId: block.projectId,
          sortOrder: block.sortOrder,
          isLocked: block.isLocked,
          title: block.title,
          content: block.content,
        })
        .onConflictDoUpdate({
          target: scriptBlocks.id,
          set: {
            sortOrder: block.sortOrder,
            isLocked: block.isLocked,
            title: block.title,
            content: block.content,
          },
        });
    }

    // 3. Synchronize Child Collection: KnowledgeSnapshots (Immutable, insert only)
    for (const snapshot of project.snapshots) {
      await this.dbService.client
        .insert(knowledgeSnapshots)
        .values({
          id: snapshot.id,
          projectId: snapshot.projectId,
          assetId: snapshot.assetId,
          title: snapshot.title,
          capturedVersionId: snapshot.capturedVersionId,
          frozenContent: snapshot.frozenContent,
          attachedAt: snapshot.attachedAt,
        })
        .onConflictDoNothing({
          target: knowledgeSnapshots.id,
        });
    }
  }

  /**
   * Checks if an active project exists.
   */
  public async exists(id: string): Promise<boolean> {
    const rows = await this.dbService.client
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);

    return rows.length > 0;
  }
}
