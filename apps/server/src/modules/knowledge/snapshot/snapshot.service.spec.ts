import type { DatabaseService } from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import type { TransactionManager } from "@rishi/transaction";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdvisoryLockService } from "../../../common/queue/index.js";
import type { SnapshotRepository, SnapshotSource } from "./repository/snapshot.repository.js";
import {
  SnapshotConflictException,
  SnapshotIntegrityException,
  SnapshotNotFoundException,
  SnapshotSourceUnavailableException,
} from "./snapshot.errors.js";
import { SnapshotService } from "./snapshot.service.js";

const projectId = "11111111-1111-4111-8111-111111111111";
const assetId = "22222222-2222-4222-8222-222222222222";
const snapshotId = "33333333-3333-4333-8333-333333333333";
const source: SnapshotSource = {
  projectId,
  assetId,
  title: "Source",
  versionId: 3,
  chunks: [
    {
      chunkText: "first",
      embedding: Array<number>(1536).fill(0),
      chunkIndex: 0,
      tokenCount: 1,
      embeddingProvider: "controlled",
      embeddingModel: "fixture",
      embeddingDimension: 1536,
    },
    {
      chunkText: "second",
      embedding: Array<number>(1536).fill(1),
      chunkIndex: 1,
      tokenCount: 1,
      embeddingProvider: "controlled",
      embeddingModel: "fixture",
      embeddingDimension: 1536,
    },
  ],
};

describe("SnapshotService", () => {
  let repository: {
    findByProjectAsset: ReturnType<typeof vi.fn>;
    findSource: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByProjectId: ReturnType<typeof vi.fn>;
  };
  let locks: { tryAcquireLock: ReturnType<typeof vi.fn> };
  let service: SnapshotService;

  beforeEach(() => {
    repository = {
      findByProjectAsset: vi.fn(async () => null),
      findSource: vi.fn(async () => source),
      create: vi.fn(async () => ({ id: snapshotId, created: true })),
      delete: vi.fn(async () => true),
      findById: vi.fn(async () => null),
      findByProjectId: vi.fn(async () => []),
    };
    locks = { tryAcquireLock: vi.fn(async () => true) };
    const transactions = {
      runInTransaction: vi.fn(async (_client, work: () => Promise<unknown>) => work()),
    } as unknown as TransactionManager;
    const logger: ILogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    service = new SnapshotService(
      repository as unknown as SnapshotRepository,
      { client: {} } as DatabaseService,
      transactions,
      locks as unknown as AdvisoryLockService,
      logger
    );
  });

  it("copies ordered source data into a write-once snapshot", async () => {
    await expect(service.createProjectAssetSnapshot({ projectId, assetId })).resolves.toBe(
      snapshotId
    );
    expect(locks.tryAcquireLock).toHaveBeenCalledWith(assetId);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        assetId,
        title: "Source",
        capturedVersionId: 3,
        frozenContent: "first\n\nsecond",
        chunks: source.chunks,
      })
    );
  });

  it("returns a complete existing snapshot idempotently", async () => {
    repository.findByProjectAsset.mockResolvedValue({ id: snapshotId, chunks: [{}] });
    await expect(service.createProjectAssetSnapshot({ projectId, assetId })).resolves.toBe(
      snapshotId
    );
    expect(repository.findSource).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects incomplete existing snapshots and unavailable sources", async () => {
    repository.findByProjectAsset.mockResolvedValue({ id: snapshotId, chunks: [] });
    await expect(service.createProjectAssetSnapshot({ projectId, assetId })).rejects.toBeInstanceOf(
      SnapshotIntegrityException
    );
    repository.findByProjectAsset.mockResolvedValue(null);
    repository.findSource.mockResolvedValue(null);
    await expect(service.createProjectAssetSnapshot({ projectId, assetId })).rejects.toBeInstanceOf(
      SnapshotSourceUnavailableException
    );
  });

  it("rejects concurrent creation when the source lock is held", async () => {
    locks.tryAcquireLock.mockResolvedValue(false);
    await expect(service.createProjectAssetSnapshot({ projectId, assetId })).rejects.toBeInstanceOf(
      SnapshotConflictException
    );
  });

  it("removes only a snapshot linked to the requested project", async () => {
    await expect(
      service.removeProjectAssetSnapshot(projectId, snapshotId)
    ).resolves.toBeUndefined();
    repository.delete.mockResolvedValue(false);
    await expect(service.removeProjectAssetSnapshot(projectId, snapshotId)).rejects.toBeInstanceOf(
      SnapshotNotFoundException
    );
  });
});
