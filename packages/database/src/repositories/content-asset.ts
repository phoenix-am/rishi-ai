import { IContentAssetRepository, ContentAsset } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { contentAssets } from "../schema/index.js";
import { ContentAssetMapper } from "../mappers.js";
import { eq } from "drizzle-orm";

export class DrizzleContentAssetRepository implements IContentAssetRepository {
  constructor(private readonly dbService: DatabaseService) {}

  public async findById(id: string): Promise<ContentAsset | null> {
    const assetRows = await this.dbService.client
      .select()
      .from(contentAssets)
      .where(eq(contentAssets.id, id))
      .limit(1);

    if (assetRows.length === 0) return null;
    return ContentAssetMapper.toDomain(assetRows[0]!);
  }

  public async findByProjectId(projectId: string): Promise<ContentAsset[]> {
    const assetRows = await this.dbService.client
      .select()
      .from(contentAssets)
      .where(eq(contentAssets.projectId, projectId));

    return assetRows.map((row) => ContentAssetMapper.toDomain(row));
  }

  public async save(asset: ContentAsset): Promise<void> {
    const data = ContentAssetMapper.toPersistence(asset);

    const existingRows = await this.dbService.client
      .select({ id: contentAssets.id })
      .from(contentAssets)
      .where(eq(contentAssets.id, asset.id))
      .limit(1);

    if (existingRows.length === 0) {
      await this.dbService.client.insert(contentAssets).values(data);
    } else {
      await this.dbService.client
        .update(contentAssets)
        .set({
          projectId: data.projectId,
          workspaceId: data.workspaceId,
          type: data.type,
          contentUrl: data.contentUrl,
          textContent: data.textContent,
          createdAt: data.createdAt,
        })
        .where(eq(contentAssets.id, asset.id));
    }
  }

  public async exists(id: string): Promise<boolean> {
    const rows = await this.dbService.client
      .select({ id: contentAssets.id })
      .from(contentAssets)
      .where(eq(contentAssets.id, id))
      .limit(1);

    return rows.length > 0;
  }
}
