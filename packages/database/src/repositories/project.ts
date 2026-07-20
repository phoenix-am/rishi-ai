import { IProjectRepository, Project } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { projects } from "../schema/index.js";
import { ProjectMapper } from "../mappers.js";
import { eq } from "drizzle-orm";

export class PersistenceException extends Error {
  constructor(message: string) {
    super(`[Persistence Error] ${message}`);
    this.name = "PersistenceException";
  }
}

export class OptimisticLockingException extends PersistenceException {
  constructor(entityId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Concurrent update detected on Project '${entityId}'. Expected version: ${expectedVersion}, but found version: ${actualVersion} in database.`
    );
    this.name = "OptimisticLockingException";
  }
}

export class DrizzleProjectRepository implements IProjectRepository {
  constructor(private readonly dbService: DatabaseService) {}

  public async findById(id: string): Promise<Project | null> {
    const projectRows = await this.dbService.client
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (projectRows.length === 0) return null;
    return ProjectMapper.toDomain(projectRows[0]!);
  }

  public async save(project: Project): Promise<void> {
    const data = ProjectMapper.toPersistence(project);

    const existingRows = await this.dbService.client
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, project.id))
      .limit(1);

    if (existingRows.length === 0) {
      await this.dbService.client.insert(projects).values(data);
    } else {
      await this.dbService.client
        .update(projects)
        .set({
          name: data.name,
          description: data.description,
          status: data.status,
          createdAt: data.createdAt,
        })
        .where(eq(projects.id, project.id));
    }
  }

  public async exists(id: string): Promise<boolean> {
    const rows = await this.dbService.client
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    return rows.length > 0;
  }
}
