import { IKnowledgeAssetRepository, KnowledgeAsset } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { knowledgeAssets } from "../schema/index.js";
import { AssetMapper } from "../mappers.js";
import { eq, and, isNull } from "drizzle-orm";

/**
 * KnowledgeAsset persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleKnowledgeAssetRepository implements IKnowledgeAssetRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves knowledge asset by ID, applying soft delete filter by default.
   */
  public async findById(
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<KnowledgeAsset | null> {
    const filter = options?.includeDeleted
      ? eq(knowledgeAssets.id, id)
      : and(eq(knowledgeAssets.id, id), isNull(knowledgeAssets.deletedAt));

    const rows = await this.dbService.client.select().from(knowledgeAssets).where(filter).limit(1);

    if (rows.length === 0) return null;
    return AssetMapper.toDomain(rows[0]!);
  }

  /**
   * Saves knowledge asset state.
   */
  public async save(asset: KnowledgeAsset): Promise<void> {
    const data = AssetMapper.toPersistence(asset);
    await this.dbService.client
      .insert(knowledgeAssets)
      .values(data)
      .onConflictDoUpdate({
        target: knowledgeAssets.id,
        set: {
          title: data.title,
          storagePath: data.storagePath,
          versionId: data.versionId,
          status: data.status,
          deletedAt: data.deletedAt,
        },
      });
  }

  /**
   * Checks if an active asset exists.
   */
  public async exists(id: string): Promise<boolean> {
    const rows = await this.dbService.client
      .select({ id: knowledgeAssets.id })
      .from(knowledgeAssets)
      .where(and(eq(knowledgeAssets.id, id), isNull(knowledgeAssets.deletedAt)))
      .limit(1);

    return rows.length > 0;
  }
}
