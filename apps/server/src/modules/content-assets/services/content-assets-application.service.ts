import { Injectable, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import {
  CONTENT_ASSET_REPOSITORY,
  PROJECT_REPOSITORY,
  ContentAsset,
  ContentAssetType,
} from "@rishi/domain";
import type { IContentAssetRepository, IProjectRepository } from "@rishi/domain";
import { TransactionManager } from "@rishi/transaction";

import { CreateContentAssetDto } from "../dto/create-content-asset.dto.js";
import { UpdateContentAssetDto } from "../dto/update-content-asset.dto.js";
import { ContentAssetResponseDto } from "../dto/content-asset-response.dto.js";
import { randomUUID } from "crypto";

@Injectable()
export class ContentAssetsApplicationService {
  constructor(
    @Inject(CONTENT_ASSET_REPOSITORY) private readonly assetRepository: IContentAssetRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepository: IProjectRepository,
    @Inject(TransactionManager) private readonly txManager: TransactionManager,
    @Inject("DRIZZLE_CLIENT") private readonly drizzleClient: any
  ) {}

  public async create(
    workspaceId: string,
    dto: CreateContentAssetDto
  ): Promise<ContentAssetResponseDto> {
    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      await this.assertProjectWorkspace(workspaceId, dto.projectId);
      const id = randomUUID();
      const asset = new ContentAsset(
        id,
        dto.projectId,
        workspaceId,
        dto.type as ContentAssetType,
        dto.contentUrl || null,
        dto.textContent || null,
        new Date()
      );
      await this.assetRepository.save(asset);
      return ContentAssetResponseDto.fromDomain(asset);
    });
  }

  public async update(
    workspaceId: string,
    id: string,
    dto: UpdateContentAssetDto
  ): Promise<ContentAssetResponseDto> {
    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      const asset = await this.assetRepository.findById(id);
      if (!asset) throw new NotFoundException(`Content Asset '${id}' not found.`);
      if (asset.workspaceId !== workspaceId) throw new ForbiddenException("Access Denied.");

      const updated = new ContentAsset(
        asset.id,
        asset.projectId,
        asset.workspaceId,
        asset.type,
        dto.contentUrl !== undefined ? dto.contentUrl || null : asset.contentUrl,
        dto.textContent !== undefined ? dto.textContent || null : asset.textContent,
        asset.createdAt
      );

      await this.assetRepository.save(updated);
      return ContentAssetResponseDto.fromDomain(updated);
    });
  }

  public async getById(workspaceId: string, id: string): Promise<ContentAssetResponseDto> {
    const asset = await this.assetRepository.findById(id);
    if (!asset) throw new NotFoundException(`Content Asset '${id}' not found.`);
    if (asset.workspaceId !== workspaceId) throw new ForbiddenException("Access Denied.");
    return ContentAssetResponseDto.fromDomain(asset);
  }

  public async listByProjectId(
    workspaceId: string,
    projectId: string
  ): Promise<ContentAssetResponseDto[]> {
    await this.assertProjectWorkspace(workspaceId, projectId);
    const assets = await this.assetRepository.findByProjectId(projectId);
    return assets
      .filter((asset) => asset.workspaceId === workspaceId)
      .map((asset) => ContentAssetResponseDto.fromDomain(asset));
  }

  private async assertProjectWorkspace(workspaceId: string, projectId: string): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (!project || project.workspaceId !== workspaceId) {
      throw new ForbiddenException("Access Denied: Project is outside the active workspace.");
    }
  }
}
