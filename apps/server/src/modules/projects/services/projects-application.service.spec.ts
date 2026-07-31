import type { DatabaseService } from "@rishi/database";
import { InvalidStateTransitionException, Project } from "@rishi/domain";
import type { ILogger } from "@rishi/logger";
import type { TransactionManager } from "@rishi/transaction";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SnapshotService } from "../../knowledge/snapshot/index.js";
import { OptimisticLockException } from "../errors/optimistic-lock.exception.js";
import { ProjectNotFoundException } from "../errors/project-not-found.exception.js";
import { ProjectsApplicationService } from "./projects-application.service.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const assetId = "33333333-3333-4333-8333-333333333333";
const snapshotId = "44444444-4444-4444-8444-444444444444";

describe("ProjectsApplicationService", () => {
  let repository: {
    findById: ReturnType<typeof vi.fn>;
    findByWorkspaceAndId: ReturnType<typeof vi.fn>;
    findByWorkspaceId: ReturnType<typeof vi.fn>;
    countByWorkspaceId: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    updateStateWithLock: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
  };
  let snapshots: Record<string, ReturnType<typeof vi.fn>>;
  let logger: ILogger;
  let service: ProjectsApplicationService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByWorkspaceAndId: vi.fn(),
      findByWorkspaceId: vi.fn(async () => []),
      countByWorkspaceId: vi.fn(async () => 0),
      save: vi.fn(),
      updateStateWithLock: vi.fn(),
      exists: vi.fn(),
    };
    snapshots = {
      createProjectAssetSnapshot: vi.fn(async () => snapshotId),
      getProjectAssetSnapshot: vi.fn(async () => ({ id: snapshotId, chunks: [] })),
      listProjectSnapshots: vi.fn(async () => []),
      removeProjectAssetSnapshot: vi.fn(),
    };
    const transactions = {
      runInTransaction: vi.fn(async (_database, work: () => Promise<unknown>) => work()),
    } as unknown as TransactionManager;
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    service = new ProjectsApplicationService(
      repository as never,
      { client: {} } as DatabaseService,
      transactions,
      snapshots as unknown as SnapshotService,
      logger
    );
  });

  it("creates a new project in draft at version one", async () => {
    const created = await service.create(workspaceId, { name: "Workspace Project" });
    expect(created).toMatchObject({ workspaceId, status: "draft", version: 1 });
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it("performs a valid state transition with an optimistic version predicate", async () => {
    const draft = project();
    const research = draft.transitionTo("research");
    repository.findByWorkspaceAndId.mockResolvedValue(draft);
    repository.updateStateWithLock.mockResolvedValue(research);

    const result = await service.transitionProjectState(workspaceId, projectId, {
      targetState: "research",
      expectedVersion: 1,
    });

    expect(result).toMatchObject({ status: "research", version: 2 });
    expect(repository.updateStateWithLock).toHaveBeenCalledWith(
      projectId,
      workspaceId,
      "research",
      null,
      false,
      1,
      expect.any(Date)
    );
  });

  it("preserves the existing update API while routing status changes through lifecycle rules", async () => {
    const draft = project();
    const research = draft.transitionTo("research");
    repository.findByWorkspaceAndId.mockResolvedValue(draft);
    repository.updateStateWithLock.mockResolvedValue(research);

    const result = await service.update(workspaceId, projectId, {
      name: "Renamed",
      status: "research",
    });

    expect(result.status).toBe("research");
    expect(repository.save).toHaveBeenCalledOnce();
    expect(repository.updateStateWithLock).toHaveBeenCalledWith(
      projectId,
      workspaceId,
      "research",
      null,
      false,
      1,
      expect.any(Date)
    );
  });

  it("rejects invalid transitions and stale or concurrently changed versions", async () => {
    repository.findByWorkspaceAndId.mockResolvedValue(project());
    await expect(
      service.transitionProjectState(workspaceId, projectId, {
        targetState: "script_generated",
        expectedVersion: 1,
      })
    ).rejects.toBeInstanceOf(InvalidStateTransitionException);

    await expect(
      service.transitionProjectState(workspaceId, projectId, {
        targetState: "research",
        expectedVersion: 2,
      })
    ).rejects.toBeInstanceOf(OptimisticLockException);

    repository.updateStateWithLock.mockResolvedValue(null);
    await expect(
      service.transitionProjectState(workspaceId, projectId, {
        targetState: "research",
        expectedVersion: 1,
      })
    ).rejects.toBeInstanceOf(OptimisticLockException);
  });

  it("records drift when moving backward", async () => {
    const organized = new Project(
      projectId,
      workspaceId,
      "Project",
      null,
      "knowledge_organized",
      new Date(),
      3
    );
    const backstep = organized.transitionTo("research");
    repository.findByWorkspaceAndId.mockResolvedValue(organized);
    repository.updateStateWithLock.mockResolvedValue(backstep);

    const result = await service.transitionProjectState(workspaceId, projectId, {
      targetState: "research",
      expectedVersion: 3,
    });
    expect(result.hasStateDrift).toBe(true);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("does not expose or mutate projects outside the active workspace", async () => {
    repository.findByWorkspaceAndId.mockResolvedValue(null);
    await expect(service.getById(workspaceId, projectId)).rejects.toBeInstanceOf(
      ProjectNotFoundException
    );
    await expect(service.attachSnapshot(workspaceId, projectId, assetId)).rejects.toBeInstanceOf(
      ProjectNotFoundException
    );
    expect(snapshots.createProjectAssetSnapshot).not.toHaveBeenCalled();
  });

  it("delegates immutable snapshot attachment through the completed Snapshot module", async () => {
    repository.findByWorkspaceAndId.mockResolvedValue(project());
    await expect(service.attachSnapshot(workspaceId, projectId, assetId)).resolves.toMatchObject({
      id: snapshotId,
    });
    expect(snapshots.createProjectAssetSnapshot).toHaveBeenCalledWith({ projectId, assetId });
    await service.detachSnapshot(workspaceId, projectId, snapshotId);
    expect(snapshots.removeProjectAssetSnapshot).toHaveBeenCalledWith(projectId, snapshotId);
  });
});

function project(): Project {
  return new Project(projectId, workspaceId, "Project");
}
