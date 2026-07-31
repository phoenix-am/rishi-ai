import { IKnowledgeSnapshotRepository, KnowledgeSnapshot } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { knowledgeSnapshots } from "../schema/index.js";
import { SnapshotMapper } from "../mappers.js";
import { and, eq } from "drizzle-orm";

/**
 * KnowledgeSnapshot persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleKnowledgeSnapshotRepository implements IKnowledgeSnapshotRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves specific snapshot by ID.
   */
  public async findById(id: string): Promise<KnowledgeSnapshot | null> {
    const rows = await this.dbService.client
      .select()
      .from(knowledgeSnapshots)
      .where(eq(knowledgeSnapshots.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return SnapshotMapper.toDomain(rows[0]!);
  }

  /**
   * Resolves all snapshots attached to a specific project.
   */
  public async findByProjectId(projectId: string): Promise<KnowledgeSnapshot[]> {
    const rows = await this.dbService.client
      .select()
      .from(knowledgeSnapshots)
      .where(eq(knowledgeSnapshots.projectId, projectId));

    return rows.map((r) => SnapshotMapper.toDomain(r));
  }

  public async findByProjectAsset(
    projectId: string,
    assetId: string
  ): Promise<KnowledgeSnapshot | null> {
    const rows = await this.dbService.client
      .select()
      .from(knowledgeSnapshots)
      .where(
        and(eq(knowledgeSnapshots.projectId, projectId), eq(knowledgeSnapshots.assetId, assetId))
      )
      .limit(1);
    return rows[0] ? SnapshotMapper.toDomain(rows[0]) : null;
  }

  /**
   * Saves a snapshot (insert only; snapshots are immutable).
   */
  public async save(snapshot: KnowledgeSnapshot): Promise<void> {
    const data = SnapshotMapper.toPersistence(snapshot);
    await this.dbService.client.insert(knowledgeSnapshots).values(data);
  }

  public async delete(projectId: string, snapshotId: string): Promise<boolean> {
    const deleted = await this.dbService.client
      .delete(knowledgeSnapshots)
      .where(
        and(eq(knowledgeSnapshots.projectId, projectId), eq(knowledgeSnapshots.id, snapshotId))
      )
      .returning({ id: knowledgeSnapshots.id });
    return deleted.length === 1;
  }
}
