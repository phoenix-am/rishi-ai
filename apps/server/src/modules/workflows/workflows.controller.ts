import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  Sse,
  MessageEvent,
  UseInterceptors,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/security/jwt-auth.guard.js";
import { WorkspaceGuard } from "../../common/security/workspace.guard.js";
import { CurrentWorkspace } from "../../common/security/current-workspace.decorator.js";
import { WorkflowsService } from "./services/workflows.service.js";
import { CreateWorkflowDto } from "./dto/create-workflow.dto.js";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto.js";
import { WorkflowResponseDto } from "./dto/workflow-response.dto.js";
import { PaginationQueryDto } from "../../common/pagination/dto/pagination-query.dto.js";
import { PaginationTransformPipe } from "../../common/pagination/pipes/pagination-transform.pipe.js";
import { ApiStandardResponse, ApiPaginatedResponse } from "../../common/swagger/index.js";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Observable, fromEvent } from "rxjs";
import { map, takeWhile } from "rxjs/operators";
import { StreamEventDto } from "../../common/streaming/dto/stream-event.dto.js";
import { SseInterceptor } from "../../common/streaming/sse.interceptor.js";

export interface WorkflowRunEventPayload {
  type: string;
  runId: string;
  nodeId?: string;
  data?: any;
  error?: string;
  timestamp: string;
}

@ApiTags("Workflows")
@ApiBearerAuth()
@ApiHeader({
  name: "x-workspace-id",
  description: "The active workspace identifier",
  required: true,
})
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("workflows")
export class WorkflowsController {
  constructor(
    @Inject(WorkflowsService)
    private readonly workflowsService: WorkflowsService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new workflow definition in the active workspace" })
  @ApiStandardResponse(WorkflowResponseDto, { status: HttpStatus.CREATED })
  public async create(
    @CurrentWorkspace() workspace: { id: string },
    @Body(new ValidationPipe({ transform: true, expectedType: CreateWorkflowDto }))
    dto: CreateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.create(workspace.id, dto);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update an existing workflow definition in the active workspace" })
  @ApiStandardResponse(WorkflowResponseDto)
  public async update(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, expectedType: UpdateWorkflowDto }))
    dto: UpdateWorkflowDto
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.update(workspace.id, id, dto);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retrieve a workflow definition by ID" })
  @ApiStandardResponse(WorkflowResponseDto)
  public async getById(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.getById(workspace.id, id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List and paginate workflow definitions in the active workspace" })
  @ApiPaginatedResponse(WorkflowResponseDto)
  public async list(
    @CurrentWorkspace() workspace: { id: string },
    @Query(PaginationTransformPipe) query: PaginationQueryDto
  ) {
    return this.workflowsService.list(workspace.id, query);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a workflow definition by ID" })
  public async delete(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<void> {
    await this.workflowsService.delete(workspace.id, id);
  }

  @Post(":id/runs")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Trigger/run a workflow" })
  public async triggerRun(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() inputs: Record<string, any>
  ) {
    const run = await this.workflowsService.createRun(workspace.id, id, inputs);
    return {
      id: run.id,
      workflowId: run.workflowId,
      workspaceId: run.workspaceId,
      status: run.status,
      state: run.state,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  }

  @Get("runs/:runId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retrieve details of a workflow run by ID" })
  public async getRun(
    @CurrentWorkspace() workspace: { id: string },
    @Param("runId", ParseUUIDPipe) runId: string
  ) {
    const run = await this.workflowsService.getRun(workspace.id, runId);
    return {
      id: run.id,
      workflowId: run.workflowId,
      workspaceId: run.workspaceId,
      status: run.status,
      state: run.state,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
  }

  @Sse(":runId/stream")
  @UseInterceptors(SseInterceptor)
  @ApiOperation({ summary: "Stream real-time workflow execution events" })
  public async stream(
    @CurrentWorkspace() workspace: { id: string },
    @Param("runId", ParseUUIDPipe) runId: string
  ): Promise<Observable<MessageEvent>> {
    // Validate that the user owns the workspace associated with the runId
    await this.workflowsService.getRun(workspace.id, runId);

    return (
      fromEvent(this.eventEmitter, `workflow.run.${runId}`) as Observable<WorkflowRunEventPayload>
    ).pipe(
      takeWhile(
        (payload) => payload.type !== "RUN_COMPLETED" && payload.type !== "RUN_FAILED",
        true
      ),
      map((payload) => {
        // We use StreamEventDto to ensure it adheres to the established SSE infrastructure
        const streamEvent = new StreamEventDto({
          event: payload.type,
          data: JSON.stringify(payload),
        });

        return {
          data: streamEvent.toWireFormat(),
        } as MessageEvent;
      })
    );
  }
}
