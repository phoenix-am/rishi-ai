import { Injectable, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Workflow, WorkflowRun, WORKFLOW_REPOSITORY, WORKFLOW_RUN_REPOSITORY } from "@rishi/domain";
import type { IWorkflowRepository, IWorkflowRunRepository } from "@rishi/domain";
import { DatabaseService, workflows, WorkflowMapper } from "@rishi/database";
import { TransactionManager } from "@rishi/transaction";
import { CreateWorkflowDto } from "../dto/create-workflow.dto.js";
import { UpdateWorkflowDto } from "../dto/update-workflow.dto.js";
import { WorkflowResponseDto } from "../dto/workflow-response.dto.js";
import { PaginationQueryDto } from "../../../common/pagination/dto/pagination-query.dto.js";
import { PaginatedResponseDto } from "../../../common/api/dto/api-response.dto.js";
import { eq, sql, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepo: IWorkflowRepository,
    @Inject(WORKFLOW_RUN_REPOSITORY) private readonly workflowRunRepo: IWorkflowRunRepository,
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(TransactionManager) private readonly txManager: TransactionManager,
    @Inject("DRIZZLE_CLIENT") private readonly drizzleClient: any
  ) {}

  /**
   * Creates a new workflow definition.
   */
  public async create(workspaceId: string, dto: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      const workflow = new Workflow(
        randomUUID(),
        workspaceId,
        dto.name,
        dto.description || null,
        dto.triggerType,
        dto.definition,
        "draft",
        new Date()
      );

      await this.workflowRepo.save(workflow);
      return WorkflowResponseDto.fromDomain(workflow);
    });
  }

  /**
   * Updates an existing workflow definition.
   */
  public async update(
    workspaceId: string,
    id: string,
    dto: UpdateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      const workflow = await this.workflowRepo.findById(id);
      if (!workflow) {
        throw new NotFoundException(`Workflow with ID '${id}' was not found.`);
      }

      // Enforce tenancy isolation
      if (workflow.workspaceId !== workspaceId) {
        throw new ForbiddenException("Access Denied: You do not own this workflow.");
      }

      const updatedWorkflow = new Workflow(
        workflow.id,
        workflow.workspaceId,
        dto.name !== undefined ? dto.name : workflow.name,
        dto.description !== undefined ? dto.description : workflow.description,
        dto.triggerType !== undefined ? dto.triggerType : workflow.triggerType,
        dto.definition !== undefined ? dto.definition : workflow.definition,
        dto.status !== undefined ? dto.status : workflow.status,
        workflow.createdAt
      );

      await this.workflowRepo.save(updatedWorkflow);
      return WorkflowResponseDto.fromDomain(updatedWorkflow);
    });
  }

  /**
   * Retrieves a workflow by ID, enforcing tenancy constraints.
   */
  public async getById(workspaceId: string, id: string): Promise<WorkflowResponseDto> {
    const workflow = await this.workflowRepo.findById(id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID '${id}' was not found.`);
    }

    if (workflow.workspaceId !== workspaceId) {
      throw new ForbiddenException("Access Denied: You do not own this workflow.");
    }

    return WorkflowResponseDto.fromDomain(workflow);
  }

  /**
   * Lists workflow definitions paginated and filtered by workspace.
   */
  public async list(
    workspaceId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResponseDto<WorkflowResponseDto>> {
    const filter = eq(workflows.workspaceId, workspaceId);

    // 1. Fetch total count
    const countResult = await this.dbService.client
      .select({ count: sql<number>`count(*)` })
      .from(workflows)
      .where(filter);

    const total = Number(countResult[0]?.count || 0);

    // 2. Determine sorting
    let orderByField: any = workflows.createdAt;
    if (query.sortBy === "name") {
      orderByField = workflows.name;
    }

    const sortDir = query.sortOrder === "desc" ? desc(orderByField) : asc(orderByField);
    const limit = query.limit;
    const offset = (query.page - 1) * limit;

    // 3. Fetch rows
    const rows = await this.dbService.client
      .select()
      .from(workflows)
      .where(filter)
      .orderBy(sortDir)
      .limit(limit)
      .offset(offset);

    const items = rows.map((row) => WorkflowResponseDto.fromDomain(WorkflowMapper.toDomain(row)));

    return PaginatedResponseDto.paginate(items, {
      page: query.page,
      limit: query.limit,
      total,
    });
  }

  /**
   * Deletes a workflow by ID.
   */
  public async delete(workspaceId: string, id: string): Promise<void> {
    await this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      const workflow = await this.workflowRepo.findById(id);
      if (!workflow) {
        throw new NotFoundException(`Workflow with ID '${id}' was not found.`);
      }

      if (workflow.workspaceId !== workspaceId) {
        throw new ForbiddenException("Access Denied: You do not own this workflow.");
      }

      await this.workflowRepo.delete(id);
    });
  }

  /**
   * Starts a new workflow run by setting it to PENDING.
   */
  public async createRun(
    workspaceId: string,
    workflowId: string,
    inputs: Record<string, any>
  ): Promise<WorkflowRun> {
    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      const workflow = await this.workflowRepo.findById(workflowId);
      if (!workflow) {
        throw new NotFoundException(`Workflow with ID '${workflowId}' was not found.`);
      }

      if (workflow.workspaceId !== workspaceId) {
        throw new ForbiddenException("Access Denied: You do not own this workflow.");
      }

      const run = new WorkflowRun(
        randomUUID(),
        workflowId,
        workspaceId,
        "PENDING",
        { inputs, outputs: {} },
        new Date()
      );

      await this.workflowRunRepo.save(run);
      return run;
    });
  }

  /**
   * Retrieves a workflow run by ID, enforcing tenancy.
   */
  public async getRun(workspaceId: string, runId: string): Promise<WorkflowRun> {
    const run = await this.workflowRunRepo.findById(runId);
    if (!run) {
      throw new NotFoundException(`Workflow run with ID '${runId}' was not found.`);
    }

    if (run.workspaceId !== workspaceId) {
      throw new ForbiddenException("Access Denied: You do not own this workflow run.");
    }

    return run;
  }
}
