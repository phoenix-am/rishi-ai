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
import { CreatorsApplicationService } from "./services/creators-application.service.js";
import { CreateCreatorDto } from "./dto/create-creator.dto.js";
import { UpdateCreatorDto } from "./dto/update-creator.dto.js";
import { CreatorResponseDto } from "./dto/creator-response.dto.js";
import { PaginationQueryDto } from "../../common/pagination/dto/pagination-query.dto.js";
import { PaginationTransformPipe } from "../../common/pagination/pipes/pagination-transform.pipe.js";
import { ApiStandardResponse, ApiPaginatedResponse } from "../../common/swagger/index.js";

@ApiTags("Creators")
@ApiBearerAuth()
@ApiHeader({
  name: "x-workspace-id",
  description: "The active workspace identifier",
  required: true,
})
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("creators")
export class CreatorsController {
  constructor(
    @Inject(CreatorsApplicationService)
    private readonly creatorsService: CreatorsApplicationService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new creator profile in the active workspace" })
  @ApiStandardResponse(CreatorResponseDto, { status: HttpStatus.CREATED })
  public async create(
    @CurrentWorkspace() workspace: { id: string },
    @Body(new ValidationPipe({ transform: true, expectedType: CreateCreatorDto }))
    dto: CreateCreatorDto
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.create(workspace.id, dto);
  }

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update an existing creator profile in the active workspace" })
  @ApiStandardResponse(CreatorResponseDto)
  public async update(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, expectedType: UpdateCreatorDto }))
    dto: UpdateCreatorDto
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.update(workspace.id, id, dto);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retrieve a creator profile by ID" })
  @ApiStandardResponse(CreatorResponseDto)
  public async getById(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.getById(workspace.id, id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List and paginate creator profiles in the active workspace" })
  @ApiPaginatedResponse(CreatorResponseDto)
  public async list(
    @CurrentWorkspace() workspace: { id: string },
    @Query(PaginationTransformPipe) query: PaginationQueryDto
  ) {
    return this.creatorsService.list(workspace.id, query);
  }
}
