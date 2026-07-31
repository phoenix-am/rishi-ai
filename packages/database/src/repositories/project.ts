import type { IProjectRepository, ProjectState } from "@rishi/domain";
import { Project } from "@rishi/domain";
import { DatabaseService } from "../index.js";
import { projects } from "../schema/index.js";
import { ProjectMapper } from "../mappers.js";
import { and, asc, count, eq } from "drizzle-orm";

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

  public async findByWorkspaceAndId(workspaceId: string, id: string): Promise<Project | null> {
    const rows = await this.dbService.client
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.id, id)))
      .limit(1);
    return rows[0] ? ProjectMapper.toDomain(rows[0]) : null;
  }

  public async findByWorkspaceId(
    workspaceId: string,
    limit: number,
    offset: number
  ): Promise<Project[]> {
    const rows = await this.dbService.client
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(asc(projects.createdAt), asc(projects.id))
      .limit(limit)
      .offset(offset);
    return rows.map((row) => ProjectMapper.toDomain(row));
  }

  public async countByWorkspaceId(workspaceId: string): Promise<number> {
    const rows = await this.dbService.client
      .select({ value: count() })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
    return Number(rows[0]?.value ?? 0);
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
          updatedAt: data.updatedAt,
        })
        .where(eq(projects.id, project.id));
    }
  }

  public async updateStateWithLock(
    projectId: string,
    workspaceId: string,
    targetState: ProjectState,
    previousState: Exclude<ProjectState, "archived"> | null,
    hasStateDrift: boolean,
    expectedVersion: number,
    updatedAt: Date
  ): Promise<Project | null> {
    const rows = await this.dbService.client
      .update(projects)
      .set({
        status: targetState,
        version: expectedVersion + 1,
        previousState,
        hasStateDrift,
        updatedAt,
      })
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId),
          eq(projects.version, expectedVersion)
        )
      )
      .returning();
    return rows[0] ? ProjectMapper.toDomain(rows[0]) : null;
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
