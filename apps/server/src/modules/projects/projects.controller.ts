import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/security/jwt-auth.guard.js";
import { WorkspaceGuard } from "../../common/security/workspace.guard.js";
import { CurrentWorkspace } from "../../common/security/current-workspace.decorator.js";
import { ProjectsApplicationService } from "./services/projects-application.service.js";
import { CreateProjectDto } from "./dto/create-project.dto.js";
import { UpdateProjectDto } from "./dto/update-project.dto.js";
import { ProjectResponseDto } from "./dto/project-response.dto.js";
import { PaginationQueryDto } from "../../common/pagination/dto/pagination-query.dto.js";
import { PaginationTransformPipe } from "../../common/pagination/pipes/pagination-transform.pipe.js";
import { ApiStandardResponse, ApiPaginatedResponse } from "../../common/swagger/index.js";
import { ResourceOwnershipGuard } from "../../common/security/resource-ownership.guard.js";
import { RequireWorkspaceResource } from "../../common/security/authorization-resource.decorator.js";

@ApiTags("Projects")
@ApiBearerAuth()
@ApiHeader({ name: "x-workspace-id", required: true })
@UseGuards(JwtAuthGuard, WorkspaceGuard, ResourceOwnershipGuard)
@Controller("projects")
export class ProjectsController {
  constructor(
    @Inject(ProjectsApplicationService)
    private readonly projectsService: ProjectsApplicationService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new project" })
  @ApiStandardResponse(ProjectResponseDto, { status: HttpStatus.CREATED })
  public async create(
    @CurrentWorkspace() workspace: { id: string },
    @Body(new ValidationPipe({ transform: true, expectedType: CreateProjectDto }))
    dto: CreateProjectDto
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(workspace.id, dto);
  }

  @Patch(":id")
  @RequireWorkspaceResource("project")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update an existing project" })
  @ApiStandardResponse(ProjectResponseDto)
  public async update(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, expectedType: UpdateProjectDto }))
    dto: UpdateProjectDto
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(workspace.id, id, dto);
  }

  @Get(":id")
  @RequireWorkspaceResource("project")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retrieve a project by ID" })
  @ApiStandardResponse(ProjectResponseDto)
  public async getById(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<ProjectResponseDto> {
    return this.projectsService.getById(workspace.id, id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List projects" })
  @ApiPaginatedResponse(ProjectResponseDto)
  public async list(
    @CurrentWorkspace() workspace: { id: string },
    @Query(PaginationTransformPipe) query: PaginationQueryDto
  ) {
    return this.projectsService.list(workspace.id, query);
  }
}
