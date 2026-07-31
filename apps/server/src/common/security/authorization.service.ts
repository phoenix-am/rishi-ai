import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  CONTENT_ASSET_REPOSITORY,
  CREATOR_REPOSITORY,
  KNOWLEDGE_ASSET_REPOSITORY,
  PROJECT_REPOSITORY,
  WORKFLOW_REPOSITORY,
  WORKFLOW_RUN_REPOSITORY,
} from "@rishi/domain";
import type {
  IContentAssetRepository,
  ICreatorRepository,
  IKnowledgeAssetRepository,
  IProjectRepository,
  IWorkflowRepository,
  IWorkflowRunRepository,
} from "@rishi/domain";
import type { AuthorizationResourceType } from "./authorization-resource.decorator.js";

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(CREATOR_REPOSITORY) private readonly creators: ICreatorRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projects: IProjectRepository,
    @Inject(KNOWLEDGE_ASSET_REPOSITORY)
    private readonly knowledgeAssets: IKnowledgeAssetRepository,
    @Inject(CONTENT_ASSET_REPOSITORY)
    private readonly contentAssets: IContentAssetRepository,
    @Inject(WORKFLOW_REPOSITORY) private readonly workflows: IWorkflowRepository,
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly workflowRuns: IWorkflowRunRepository
  ) {}

  public async canAccessWorkspaceResource(
    workspaceId: string,
    type: AuthorizationResourceType,
    resourceId: string
  ): Promise<boolean> {
    switch (type) {
      case "creator":
        return (await this.creators.findById(resourceId))?.workspaceId === workspaceId;
      case "project":
        return (await this.projects.findById(resourceId))?.workspaceId === workspaceId;
      case "knowledge-asset": {
        const asset = await this.knowledgeAssets.findById(resourceId);
        if (!asset?.creatorId) return false;
        return (await this.creators.findById(asset.creatorId))?.workspaceId === workspaceId;
      }
      case "content-asset":
        return (await this.contentAssets.findById(resourceId))?.workspaceId === workspaceId;
      case "workflow":
        return (await this.workflows.findById(resourceId))?.workspaceId === workspaceId;
      case "workflow-run":
        return (await this.workflowRuns.findById(resourceId))?.workspaceId === workspaceId;
    }
  }

  public async assertWorkspaceResource(
    workspaceId: string,
    type: AuthorizationResourceType,
    resourceId: string
  ): Promise<void> {
    if (!(await this.canAccessWorkspaceResource(workspaceId, type, resourceId))) {
      throw new ForbiddenException("Access Denied: Resource is outside the active workspace.");
    }
  }
}
