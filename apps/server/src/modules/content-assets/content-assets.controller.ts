import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
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
import { ContentAssetsApplicationService } from "./services/content-assets-application.service.js";
import { CreateContentAssetDto } from "./dto/create-content-asset.dto.js";
import { UpdateContentAssetDto } from "./dto/update-content-asset.dto.js";
import { ContentAssetResponseDto } from "./dto/content-asset-response.dto.js";
import { ApiStandardResponse } from "../../common/swagger/index.js";
import { ResourceOwnershipGuard } from "../../common/security/resource-ownership.guard.js";
import { RequireWorkspaceResource } from "../../common/security/authorization-resource.decorator.js";

@ApiTags("ContentAssets")
@ApiBearerAuth()
@ApiHeader({ name: "x-workspace-id", required: true })
@UseGuards(JwtAuthGuard, WorkspaceGuard, ResourceOwnershipGuard)
@Controller("content-assets")
export class ContentAssetsController {
  constructor(
    @Inject(ContentAssetsApplicationService)
    private readonly assetsService: ContentAssetsApplicationService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new content asset" })
  @ApiStandardResponse(ContentAssetResponseDto, { status: HttpStatus.CREATED })
  public async create(
    @CurrentWorkspace() workspace: { id: string },
    @Body(new ValidationPipe({ transform: true, expectedType: CreateContentAssetDto }))
    dto: CreateContentAssetDto
  ): Promise<ContentAssetResponseDto> {
    return this.assetsService.create(workspace.id, dto);
  }

  @Patch(":id")
  @RequireWorkspaceResource("content-asset")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a content asset" })
  @ApiStandardResponse(ContentAssetResponseDto)
  public async update(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, expectedType: UpdateContentAssetDto }))
    dto: UpdateContentAssetDto
  ): Promise<ContentAssetResponseDto> {
    return this.assetsService.update(workspace.id, id, dto);
  }

  @Get(":id")
  @RequireWorkspaceResource("content-asset")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retrieve a content asset by ID" })
  @ApiStandardResponse(ContentAssetResponseDto)
  public async getById(
    @CurrentWorkspace() workspace: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<ContentAssetResponseDto> {
    return this.assetsService.getById(workspace.id, id);
  }

  @Get("project/:projectId")
  @RequireWorkspaceResource("project", "projectId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List content assets for a project" })
  public async listByProjectId(
    @CurrentWorkspace() workspace: { id: string },
    @Param("projectId", ParseUUIDPipe) projectId: string
  ): Promise<ContentAssetResponseDto[]> {
    return this.assetsService.listByProjectId(workspace.id, projectId);
  }
}
