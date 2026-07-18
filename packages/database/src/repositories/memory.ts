import { IProjectMemoryRepository, ProjectMemory } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { projectMemories } from "../schema/index.js";
import { MemoryMapper } from "../mappers.js";
import { eq } from "drizzle-orm";

/**
 * ProjectMemory persistence adapter using Drizzle PostgreSQL client.
 */
export class DrizzleProjectMemoryRepository implements IProjectMemoryRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Resolves all memory logs registered for a specific project.
   */
  public async findByProjectId(projectId: string): Promise<ProjectMemory[]> {
    const rows = await this.dbService.client
      .select()
      .from(projectMemories)
      .where(eq(projectMemories.projectId, projectId));

    return rows.map((r) => MemoryMapper.toDomain(r));
  }

  /**
   * Persists a new memory log entry.
   */
  public async save(memory: ProjectMemory): Promise<void> {
    const data = MemoryMapper.toPersistence(memory);
    await this.dbService.client.insert(projectMemories).values(data).onConflictDoNothing({
      target: projectMemories.id,
    });
  }
}
