import { ICreatorRepository, Creator } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { creators } from "../schema/index.js";
import { CreatorMapper } from "../mappers.js";
import { eq, and, ne } from "drizzle-orm";

/**
 * Creator persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleCreatorRepository implements ICreatorRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves creator by ID, filtering out deleted status by default.
   */
  public async findById(
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<Creator | null> {
    const filter = options?.includeDeleted
      ? eq(creators.id, id)
      : and(eq(creators.id, id), ne(creators.status, "deleted"));

    const rows = await this.dbService.client.select().from(creators).where(filter).limit(1);

    if (rows.length === 0) return null;
    return CreatorMapper.toDomain(rows[0]!);
  }

  /**
   * Resolves creator by unique email, filtering out deleted status by default.
   */
  public async findByEmail(
    email: string,
    options?: { includeDeleted?: boolean }
  ): Promise<Creator | null> {
    const normalized = email.trim().toLowerCase();
    const filter = options?.includeDeleted
      ? eq(creators.email, normalized)
      : and(eq(creators.email, normalized), ne(creators.status, "deleted"));

    const rows = await this.dbService.client.select().from(creators).where(filter).limit(1);

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
          email: data.email,
          status: data.status,
        },
      });
  }

  /**
   * Checks if an active creator exists.
   */
  public async exists(id: string): Promise<boolean> {
    const rows = await this.dbService.client
      .select({ id: creators.id })
      .from(creators)
      .where(and(eq(creators.id, id), ne(creators.status, "deleted")))
      .limit(1);

    return rows.length > 0;
  }
}
