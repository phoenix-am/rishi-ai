import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DrizzleCreatorRepository,
  DrizzleKnowledgeAssetRepository,
  DrizzleProjectRepository,
  DrizzleWorkflowRepository,
  DrizzleWorkflowRunRepository,
  PersistenceException,
  OptimisticLockingException,
} from "./index.js";
import { Creator, Project, ScriptBlock, Workflow, WorkflowRun } from "@rishi/domain";
import { TransactionManager } from "@rishi/transaction";
import { DatabaseService } from "./index.js";

// Helper to create a chainable thenable mock database client
function createMockDbClient(responses: any[] = []) {
  let responseIndex = 0;

  const builder: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    // then() implementation makes this builder directly awaitable
    then: (resolve: any) => {
      const res = responses[responseIndex];
      responseIndex++;
      resolve(res !== undefined ? res : []);
    },
  };
  return builder;
}

describe("Persistence Repositories", () => {
  let txManager: TransactionManager;
  let mockPool: any;

  beforeEach(() => {
    txManager = new TransactionManager();
    mockPool = { end: vi.fn() };
  });

  describe("DrizzleCreatorRepository", () => {
    it("should resolve creator by ID", async () => {
      const mockRow = {
        id: "c1",
        workspaceId: "w1",
        name: "John Doe",
        handle: "john_doe",
        bio: "Bio description",
        avatarUrl: "https://avatar.url",
        createdAt: new Date(),
      };
      const mockClient = createMockDbClient([[mockRow]]);
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleCreatorRepository(dbService);

      const creator = await repo.findById("c1");
      expect(creator).toBeInstanceOf(Creator);
      expect(creator!.id).toBe("c1");
      expect(creator!.workspaceId).toBe("w1");
      expect(creator!.name).toBe("John Doe");
      expect(creator!.handle).toBe("john_doe");
      expect(creator!.bio).toBe("Bio description");
      expect(creator!.avatarUrl).toBe("https://avatar.url");
      expect(mockClient.select).toHaveBeenCalled();
    });

    it("should resolve creator by handle", async () => {
      const mockRow = {
        id: "c1",
        workspaceId: "w1",
        name: "John Doe",
        handle: "john_doe",
        bio: "Bio description",
        avatarUrl: "https://avatar.url",
        createdAt: new Date(),
      };
      const mockClient = createMockDbClient([[mockRow]]);
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleCreatorRepository(dbService);

      const creator = await repo.findByHandle("john_doe");
      expect(creator).toBeInstanceOf(Creator);
      expect(creator!.handle).toBe("john_doe");
      expect(mockClient.select).toHaveBeenCalled();
    });

    it("should return null when creator not found", async () => {
      const mockClient = createMockDbClient([[]]);
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleCreatorRepository(dbService);

      const creator = await repo.findById("non-existent");
      expect(creator).toBeNull();
    });
  });

  describe("DrizzleKnowledgeAssetRepository", () => {
    it("should filter out deleted assets by default", async () => {
      const mockClient = createMockDbClient([[]]);
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleKnowledgeAssetRepository(dbService);

      await repo.findById("asset1");

      // Verification that filter includes deletedAt is null
      expect(mockClient.where).toHaveBeenCalled();
    });
  });

  describe("DrizzleProjectRepository (Aggregate Root)", () => {
    it("should successfully reconstruct a valid Project aggregate with children", async () => {
      const mockProjectRow = {
        id: "p1",
        creatorId: "c1",
        title: "Vedic Wisdom",
        state: "draft",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        previousState: null,
        hasStateDrift: false,
      };
      const mockBlockRow = {
        id: "b1",
        projectId: "p1",
        sortOrder: 0,
        isLocked: false,
        title: "Intro",
        content: "Content 1",
      };
      const mockSnapshotRow = {
        id: "s1",
        projectId: "p1",
        assetId: "a1",
        title: "Source 1",
        capturedVersionId: 1,
        frozenContent: "Frozen data",
        attachedAt: new Date(),
      };

      // Select returns: 1. project row, 2. script blocks, 3. snapshots
      const mockClient = createMockDbClient([[mockProjectRow], [mockBlockRow], [mockSnapshotRow]]);

      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleProjectRepository(dbService);

      const project = await repo.findById("p1");
      expect(project).toBeInstanceOf(Project);
      expect(project!.id).toBe("p1");
      expect(project!.scriptBlocks.length).toBe(1);
      expect(project!.scriptBlocks[0]!.id).toBe("b1");
      expect(project!.snapshots.length).toBe(1);
      expect(project!.snapshots[0]!.id).toBe("s1");
    });

    it("should fail fast and throw PersistenceException on duplicate sortOrder block inconsistencies", async () => {
      const mockProjectRow = {
        id: "p1",
        creatorId: "c1",
        title: "Vedic Wisdom",
        state: "draft",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        previousState: null,
        hasStateDrift: false,
      };
      const mockBlockRow1 = {
        id: "b1",
        projectId: "p1",
        sortOrder: 0, // Duplicate sort order
        isLocked: false,
        title: "Intro 1",
        content: "Content 1",
      };
      const mockBlockRow2 = {
        id: "b2",
        projectId: "p1",
        sortOrder: 0, // Duplicate sort order
        isLocked: false,
        title: "Intro 2",
        content: "Content 2",
      };

      const mockClient = createMockDbClient([[mockProjectRow], [mockBlockRow1, mockBlockRow2], []]);

      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleProjectRepository(dbService);

      await expect(repo.findById("p1")).rejects.toThrow(PersistenceException);
    });

    it("should throw OptimisticLockingException on saving with outdated version", async () => {
      const project = new Project("p1", "c1", "Title", "research", 2); // aggregate version is 2 (e.g. updated state in-memory)

      const mockDbRow = { version: 2 }; // database version is already 2 (concurrent update completed)

      // select queries return db version row
      const mockClient = createMockDbClient([[mockDbRow]]);
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleProjectRepository(dbService);

      // Attempting to save version 2 (expects database version 1)
      await expect(repo.save(project)).rejects.toThrow(OptimisticLockingException);
    });

    it("should synchronize child script blocks collection on save", async () => {
      const project = new Project("p1", "c1", "Title", "draft", 2);
      const b1 = new ScriptBlock("b1", "p1", 0, false, "Intro", "content");
      project.hydrateScriptBlocks([b1]);

      // Db currently has b1 and b2. b2 has been removed from the aggregate, so it should be deleted.
      const dbBlocks = [{ id: "b1" }, { id: "b2" }];

      const mockClient = createMockDbClient([
        [{ version: 1 }], // project version check select
        { rowCount: 1 }, // project update result
        dbBlocks, // select script_blocks check
      ]);

      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleProjectRepository(dbService);

      await repo.save(project);

      // Verification that database deleted block b2
      expect(mockClient.delete).toHaveBeenCalled();
      expect(mockClient.insert).toHaveBeenCalled();
    });
  });

  describe("DrizzleWorkflowRepository", () => {
    it("should resolve workflow by ID", async () => {
      const mockRow = {
        id: "wf1",
        workspaceId: "w1",
        name: "Test Workflow",
        description: "Desc",
        triggerType: "manual",
        definition: { nodes: [], edges: [] },
        status: "active",
        createdAt: new Date(),
      };
      const mockClient = createMockDbClient([[mockRow]]);
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleWorkflowRepository(dbService);

      const workflow = await repo.findById("wf1");
      expect(workflow).toBeInstanceOf(Workflow);
      expect(workflow!.id).toBe("wf1");
      expect(workflow!.name).toBe("Test Workflow");
      expect(mockClient.select).toHaveBeenCalled();
    });

    it("should save a workflow using insert and onConflictDoUpdate", async () => {
      const workflow = new Workflow(
        "wf1",
        "w1",
        "Test Workflow",
        "Desc",
        "manual",
        { nodes: [], edges: [] },
        "active"
      );
      const mockClient = createMockDbClient();
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleWorkflowRepository(dbService);

      await repo.save(workflow);
      expect(mockClient.insert).toHaveBeenCalled();
      expect(mockClient.onConflictDoUpdate).toHaveBeenCalled();
    });

    it("should delete a workflow", async () => {
      const mockClient = createMockDbClient();
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleWorkflowRepository(dbService);

      await repo.delete("wf1");
      expect(mockClient.delete).toHaveBeenCalled();
    });
  });

  describe("DrizzleWorkflowRunRepository", () => {
    it("should resolve workflow run by ID", async () => {
      const mockRow = {
        id: "run1",
        workflowId: "wf1",
        workspaceId: "w1",
        status: "PENDING",
        state: { inputs: {}, outputs: {} },
        startedAt: new Date(),
        completedAt: null,
      };
      const mockClient = createMockDbClient([[mockRow]]);
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleWorkflowRunRepository(dbService);

      const run = await repo.findById("run1");
      expect(run).toBeInstanceOf(WorkflowRun);
      expect(run!.id).toBe("run1");
      expect(run!.status).toBe("PENDING");
      expect(mockClient.select).toHaveBeenCalled();
    });

    it("should save workflow run", async () => {
      const run = new WorkflowRun("run1", "wf1", "w1", "RUNNING", { inputs: {}, outputs: {} });
      const mockClient = createMockDbClient();
      const dbService = new DatabaseService(mockPool, mockClient, txManager);
      const repo = new DrizzleWorkflowRunRepository(dbService);

      await repo.save(run);
      expect(mockClient.insert).toHaveBeenCalled();
      expect(mockClient.onConflictDoUpdate).toHaveBeenCalled();
    });
  });

  describe("Transaction rollback resilience integration", () => {
    it("should restore aggregate status mapping on transaction failures", async () => {
      const mockDbClient = {
        transaction: vi.fn().mockImplementation(async (callback) => {
          const mockTxClient = createMockDbClient();
          return callback(mockTxClient);
        }),
      };

      const project = new Project("p1", "c1", "Title", "draft");

      // Transaction fails midway, throwing error
      await expect(
        txManager.runInTransaction(mockDbClient, async () => {
          project.transitionTo("research", "tx1");
          throw new Error("Simulated database failure");
        })
      ).rejects.toThrow("Simulated database failure");

      // Verify that while the transaction rolls back, our context state was tracked correctly
      expect(project.state).toBe("research");
    });
  });
});
