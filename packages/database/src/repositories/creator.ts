import { ICreatorRepository, Creator } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { creators } from "../schema/index.js";
import { CreatorMapper } from "../mappers.js";
import { eq } from "drizzle-orm";

/**
 * Creator persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleCreatorRepository implements ICreatorRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves creator by ID.
   */
  public async findById(id: string): Promise<Creator | null> {
    const rows = await this.dbService.client
      .select()
      .from(creators)
      .where(eq(creators.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return CreatorMapper.toDomain(rows[0]!);
  }

  /**
   * Resolves creator by unique handle.
   */
  public async findByHandle(handle: string): Promise<Creator | null> {
    const normalized = handle.trim().toLowerCase();
    const rows = await this.dbService.client
      .select()
      .from(creators)
      .where(eq(creators.handle, normalized))
      .limit(1);

    if (rows.length === 0) return null;
    return CreatorMapper.toDomain(rows[0]!);
  }

  /**
   * Saves creator state (insert or update).
   */
  public async save(creator: Creator): Promise<void> {
    const data = CreatorMapper.toPersistence(creator);
    await this.dbService.client
      .insert(creators)
      .values(data)
      .onConflictDoUpdate({
        target: creators.id,
        set: {
          workspaceId: data.workspaceId,
          name: data.name,
          handle: data.handle,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
        },
      });
  }

  /**
   * Checks if creator exists.
   */
  public async exists(id: string): Promise<boolean> {
    const rows = await this.dbService.client
      .select({ id: creators.id })
      .from(creators)
      .where(eq(creators.id, id))
      .limit(1);

    return rows.length > 0;
  }
}
