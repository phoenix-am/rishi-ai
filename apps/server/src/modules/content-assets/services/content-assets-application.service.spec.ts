import { ForbiddenException } from "@nestjs/common";
import { ContentAsset, Project } from "@rishi/domain";
import { describe, expect, it, vi } from "vitest";
import { CreateContentAssetTypeEnum } from "../dto/create-content-asset.dto.js";
import { ContentAssetsApplicationService } from "./content-assets-application.service.js";

describe("ContentAssetsApplicationService authorization", () => {
  it("creates an asset only after verifying its project belongs to the active workspace", async () => {
    const { service, assets, projects } = createService();
    projects.findById.mockResolvedValue(project("workspace-1"));

    await service.create("workspace-1", {
      projectId: "project-1",
      type: CreateContentAssetTypeEnum.SCRIPT,
      textContent: "Draft",
    });

    expect(projects.findById).toHaveBeenCalledWith("project-1");
    expect(assets.save).toHaveBeenCalledOnce();
  });

  it("rejects cross-workspace project IDs before writing an asset", async () => {
    const { service, assets, projects } = createService();
    projects.findById.mockResolvedValue(project("workspace-2"));

    await expect(
      service.create("workspace-1", {
        projectId: "project-1",
        type: CreateContentAssetTypeEnum.SCRIPT,
      })
    ).rejects.toThrow(ForbiddenException);
    expect(assets.save).not.toHaveBeenCalled();
  });

  it("rejects listing assets for a missing or foreign project", async () => {
    const { service, assets } = createService();

    await expect(service.listByProjectId("workspace-1", "project-1")).rejects.toThrow(
      ForbiddenException
    );
    expect(assets.findByProjectId).not.toHaveBeenCalled();
  });

  it("does not return inconsistent cross-workspace rows from a valid project listing", async () => {
    const { service, assets, projects } = createService();
    projects.findById.mockResolvedValue(project("workspace-1"));
    assets.findByProjectId.mockResolvedValue([
      contentAsset("asset-1", "workspace-1"),
      contentAsset("asset-2", "workspace-2"),
    ]);

    const result = await service.listByProjectId("workspace-1", "project-1");

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("asset-1");
  });
});

function createService() {
  const assets = {
    findById: vi.fn(),
    findByProjectId: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
  };
  const projects = { findById: vi.fn().mockResolvedValue(null) };
  const transactions = {
    runInTransaction: vi.fn(async (_database, work: () => Promise<unknown>) => work()),
  };
  return {
    service: new ContentAssetsApplicationService(
      assets as never,
      projects as never,
      transactions as never,
      { db: {} } as never
    ),
    assets,
    projects,
  };
}

function project(workspaceId: string): Project {
  return new Project("project-1", workspaceId, "Project");
}

function contentAsset(id: string, workspaceId: string): ContentAsset {
  return new ContentAsset(id, "project-1", workspaceId, "SCRIPT", null, "Draft");
}
