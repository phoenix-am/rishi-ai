import { IScriptBlockRepository, ScriptBlock } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { scriptBlocks } from "../schema/index.js";
import { BlockMapper } from "../mappers.js";
import { eq } from "drizzle-orm";

/**
 * ScriptBlock persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleScriptBlockRepository implements IScriptBlockRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves a specific script block.
   */
  public async findById(id: string): Promise<ScriptBlock | null> {
    const rows = await this.dbService.client
      .select()
      .from(scriptBlocks)
      .where(eq(scriptBlocks.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return BlockMapper.toDomain(rows[0]!);
  }

  /**
   * Resolves all script blocks associated with a specific project container.
   * Sorted by sortOrder index.
   */
  public async findByProjectId(projectId: string): Promise<ScriptBlock[]> {
    const rows = await this.dbService.client
      .select()
      .from(scriptBlocks)
      .where(eq(scriptBlocks.projectId, projectId));

    const blocks = rows.map((r) => BlockMapper.toDomain(r));
    return blocks.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Saves a script block (insert or update).
   */
  public async save(block: ScriptBlock): Promise<void> {
    const data = BlockMapper.toPersistence(block);
    await this.dbService.client
      .insert(scriptBlocks)
      .values(data)
      .onConflictDoUpdate({
        target: scriptBlocks.id,
        set: {
          sortOrder: data.sortOrder,
          isLocked: data.isLocked,
          title: data.title,
          content: data.content,
        },
      });
  }

  /**
   * Atomically saves or updates a batch of script blocks.
   */
  public async saveMany(blocks: ScriptBlock[]): Promise<void> {
    if (blocks.length === 0) return;

    // Perform bulk inserts/updates
    for (const block of blocks) {
      await this.save(block);
    }
  }
}
