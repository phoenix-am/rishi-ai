import { Injectable, Inject } from "@nestjs/common";
import { PROJECT_REPOSITORY, Project } from "@rishi/domain";
import type { IProjectRepository } from "@rishi/domain";
import type { ILogger } from "@rishi/logger";
import { TransactionManager } from "@rishi/transaction";
import { DatabaseService } from "@rishi/database";
import { CreateProjectDto } from "../dto/create-project.dto.js";
import { UpdateProjectDto } from "../dto/update-project.dto.js";
import { TransitionProjectStateDto } from "../dto/transition-project-state.dto.js";
import { ProjectResponseDto } from "../dto/project-response.dto.js";
import { PaginationQueryDto } from "../../../common/pagination/dto/pagination-query.dto.js";
import { PaginatedResponseDto } from "../../../common/api/dto/api-response.dto.js";
import { randomUUID } from "crypto";
import { SnapshotService, type SnapshotRecord } from "../../knowledge/snapshot/index.js";
import { OptimisticLockException } from "../errors/optimistic-lock.exception.js";
import { ProjectNotFoundException } from "../errors/project-not-found.exception.js";

@Injectable()
export class ProjectsApplicationService {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: IProjectRepository,
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(TransactionManager) private readonly txManager: TransactionManager,
    @Inject(SnapshotService) private readonly snapshots: SnapshotService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  public async create(workspaceId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    return this.txManager.runInTransaction<ProjectResponseDto>(this.dbService.client, async () => {
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
    return this.txManager.runInTransaction<ProjectResponseDto>(this.dbService.client, async () => {
      const project = await this.requireProject(workspaceId, id);

      const updated = new Project(
        project.id,
        project.workspaceId,
        dto.name ?? project.name,
        dto.description !== undefined ? dto.description || null : project.description,
        project.status,
        project.createdAt,
        project.version,
        project.previousState,
        project.hasStateDrift,
        new Date()
      );
      const transitioned =
        dto.status && dto.status !== project.status ? updated.transitionTo(dto.status) : null;

      await this.projectRepository.save(updated);
      if (!transitioned) return ProjectResponseDto.fromDomain(updated);
      const persisted = await this.projectRepository.updateStateWithLock(
        id,
        workspaceId,
        transitioned.status,
        transitioned.previousState,
        transitioned.hasStateDrift,
        project.version,
        transitioned.updatedAt
      );
      if (!persisted) throw new OptimisticLockException(id, project.version);
      this.logDrift(project, persisted);
      return ProjectResponseDto.fromDomain(persisted);
    });
  }

  public async getById(workspaceId: string, id: string): Promise<ProjectResponseDto> {
    const project = await this.requireProject(workspaceId, id);
    return ProjectResponseDto.fromDomain(project);
  }

  public async list(
    workspaceId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProjectResponseDto>> {
    const limit = query.limit;
    const offset = (query.page - 1) * limit;
    const [projects, total] = await Promise.all([
      this.projectRepository.findByWorkspaceId(workspaceId, limit, offset),
      this.projectRepository.countByWorkspaceId(workspaceId),
    ]);
    const items = projects.map((project) => ProjectResponseDto.fromDomain(project));

    return PaginatedResponseDto.paginate(items, { page: query.page, limit, total });
  }

  public async transitionProjectState(
    workspaceId: string,
    projectId: string,
    dto: TransitionProjectStateDto
  ): Promise<ProjectResponseDto> {
    return this.txManager.runInTransaction<ProjectResponseDto>(this.dbService.client, async () => {
      const project = await this.requireProject(workspaceId, projectId);
      if (project.version !== dto.expectedVersion) {
        throw new OptimisticLockException(projectId, dto.expectedVersion);
      }
      const transitioned = project.transitionTo(dto.targetState);
      const persisted = await this.projectRepository.updateStateWithLock(
        projectId,
        workspaceId,
        transitioned.status,
        transitioned.previousState,
        transitioned.hasStateDrift,
        dto.expectedVersion,
        transitioned.updatedAt
      );
      if (!persisted) throw new OptimisticLockException(projectId, dto.expectedVersion);
      this.logDrift(project, persisted);
      return ProjectResponseDto.fromDomain(persisted);
    });
  }

  public async attachSnapshot(
    workspaceId: string,
    projectId: string,
    assetId: string
  ): Promise<SnapshotRecord> {
    await this.requireProject(workspaceId, projectId);
    const snapshotId = await this.snapshots.createProjectAssetSnapshot({ projectId, assetId });
    return this.snapshots.getProjectAssetSnapshot(projectId, snapshotId);
  }

  public async listSnapshots(workspaceId: string, projectId: string): Promise<SnapshotRecord[]> {
    await this.requireProject(workspaceId, projectId);
    return this.snapshots.listProjectSnapshots(projectId);
  }

  public async detachSnapshot(
    workspaceId: string,
    projectId: string,
    snapshotId: string
  ): Promise<void> {
    await this.requireProject(workspaceId, projectId);
    await this.snapshots.removeProjectAssetSnapshot(projectId, snapshotId);
  }

  private async requireProject(workspaceId: string, projectId: string): Promise<Project> {
    const project = await this.projectRepository.findByWorkspaceAndId(workspaceId, projectId);
    if (!project) throw new ProjectNotFoundException();
    return project;
  }

  private logDrift(previous: Project, current: Project): void {
    if (previous.hasStateDrift || !current.hasStateDrift) return;
    this.logger.warn("Project state moved backward and downstream context may be stale.", {
      projectId: current.id,
      workspaceId: current.workspaceId,
      previousState: previous.status,
      currentState: current.status,
    });
  }
}
