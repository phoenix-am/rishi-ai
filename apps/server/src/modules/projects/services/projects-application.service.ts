import { Injectable, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PROJECT_REPOSITORY, Project } from "@rishi/domain";
import type { IProjectRepository } from "@rishi/domain";
import { TransactionManager } from "@rishi/transaction";
import { DatabaseService, projects, ProjectMapper } from "@rishi/database";
import { CreateProjectDto } from "../dto/create-project.dto.js";
import { UpdateProjectDto } from "../dto/update-project.dto.js";
import { ProjectResponseDto } from "../dto/project-response.dto.js";
import { PaginationQueryDto } from "../../../common/pagination/dto/pagination-query.dto.js";
import { PaginatedResponseDto } from "../../../common/api/dto/api-response.dto.js";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

@Injectable()
export class ProjectsApplicationService {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: IProjectRepository,
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(TransactionManager) private readonly txManager: TransactionManager,
    @Inject("DRIZZLE_CLIENT") private readonly drizzleClient: any
  ) {}

  public async create(workspaceId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      const id = randomUUID();
      const project = new Project(
        id,
        workspaceId,
        dto.name,
        dto.description || null,
        "draft",
        new Date()
      );
      await this.projectRepository.save(project);
      return ProjectResponseDto.fromDomain(project);
    });
  }

  public async update(
    workspaceId: string,
    id: string,
    dto: UpdateProjectDto
  ): Promise<ProjectResponseDto> {
    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      const project = await this.projectRepository.findById(id);
      if (!project) throw new NotFoundException(`Project '${id}' not found.`);
      if (project.workspaceId !== workspaceId) throw new ForbiddenException("Access Denied.");

      const updated = new Project(
        project.id,
        project.workspaceId,
        dto.name ?? project.name,
        dto.description !== undefined ? dto.description || null : project.description,
        dto.status ?? project.status,
        project.createdAt
      );

      await this.projectRepository.save(updated);
      return ProjectResponseDto.fromDomain(updated);
    });
  }

  public async getById(workspaceId: string, id: string): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundException(`Project '${id}' not found.`);
    if (project.workspaceId !== workspaceId) throw new ForbiddenException("Access Denied.");
    return ProjectResponseDto.fromDomain(project);
  }

  public async list(
    workspaceId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProjectResponseDto>> {
    const filter = eq(projects.workspaceId, workspaceId);
    const countResult = await this.dbService.client
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(filter);
    const total = Number(countResult[0]?.count || 0);

    const limit = query.limit;
    const offset = (query.page - 1) * limit;

    const rows = await this.dbService.client
      .select()
      .from(projects)
      .where(filter)
      .limit(limit)
      .offset(offset);

    const items = rows.map((row) => ProjectResponseDto.fromDomain(ProjectMapper.toDomain(row)));

    return PaginatedResponseDto.paginate(items, { page: query.page, limit, total });
  }
}
