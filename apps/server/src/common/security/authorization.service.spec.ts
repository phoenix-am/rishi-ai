import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationService } from "./authorization.service.js";
import type { AuthorizationResourceType } from "./authorization-resource.decorator.js";

describe("AuthorizationService", () => {
  const workspaceId = "workspace-1";

  const cases: Array<[AuthorizationResourceType, number]> = [
    ["creator", 0],
    ["project", 1],
    ["content-asset", 3],
    ["workflow", 4],
    ["workflow-run", 5],
  ];

  it.each(cases)("resolves %s ownership through its repository", async (type, repositoryIndex) => {
    const repositories = createRepositories();
    repositories[repositoryIndex]!.findById.mockResolvedValue({ workspaceId });
    const service = createService(repositories);

    await expect(service.canAccessWorkspaceResource(workspaceId, type, "resource-1")).resolves.toBe(
      true
    );
    expect(repositories[repositoryIndex]!.findById).toHaveBeenCalledWith("resource-1");
  });

  it("resolves knowledge-asset ownership through its creator workspace", async () => {
    const repositories = createRepositories();
    repositories[2].findById.mockResolvedValue({ creatorId: "creator-1" });
    repositories[0].findById.mockResolvedValue({ workspaceId });
    const service = createService(repositories);

    await expect(
      service.canAccessWorkspaceResource(workspaceId, "knowledge-asset", "asset-1")
    ).resolves.toBe(true);
    expect(repositories[0].findById).toHaveBeenCalledWith("creator-1");
  });

  it("denies platform-wide knowledge assets at the private ownership boundary", async () => {
    const repositories = createRepositories();
    repositories[2].findById.mockResolvedValue({ creatorId: null });
    const service = createService(repositories);

    await expect(
      service.canAccessWorkspaceResource(workspaceId, "knowledge-asset", "asset-1")
    ).resolves.toBe(false);
  });

  it("denies missing resources without disclosing whether they exist", async () => {
    const repositories = createRepositories();
    const service = createService(repositories);

    await expect(
      service.assertWorkspaceResource(workspaceId, "project", "missing-project")
    ).rejects.toThrow(ForbiddenException);
  });

  it("denies resources owned by another workspace", async () => {
    const repositories = createRepositories();
    repositories[1].findById.mockResolvedValue({ workspaceId: "workspace-2" });
    const service = createService(repositories);

    await expect(
      service.assertWorkspaceResource(workspaceId, "project", "foreign-project")
    ).rejects.toThrow(ForbiddenException);
  });
});

function createRepositories() {
  const repository = () => ({ findById: vi.fn().mockResolvedValue(null) });
  return [
    repository(),
    repository(),
    repository(),
    repository(),
    repository(),
    repository(),
  ] as const;
}

function createService(repositories: ReturnType<typeof createRepositories>) {
  return new AuthorizationService(
    repositories[0] as never,
    repositories[1] as never,
    repositories[2] as never,
    repositories[3] as never,
    repositories[4] as never,
    repositories[5] as never
  );
}
