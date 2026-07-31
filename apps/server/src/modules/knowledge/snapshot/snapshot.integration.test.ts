import { randomUUID } from "node:crypto";
import { ConfigService } from "@rishi/config";
import {
  createDatabaseClient,
  DatabaseService,
  DrizzleKnowledgeSnapshotRepository,
  runDatabaseMigrations,
} from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import { TransactionManager } from "@rishi/transaction";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AdvisoryLockService } from "../../../common/queue/index.js";
import { SnapshotRepository } from "./repository/snapshot.repository.js";
import {
  SnapshotConflictException,
  SnapshotNotFoundException,
  SnapshotSourceUnavailableException,
} from "./snapshot.errors.js";
import { SnapshotService } from "./snapshot.service.js";

const integrationEnabled = process.env.DATABASE_INTEGRATION_TESTS === "true";

function configFor(databaseUrl: string): ConfigService {
  return new ConfigService({
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    JWT_PRIVATE_KEY: "test-private-key",
    JWT_PUBLIC_KEY: "test-public-key",
  });
}

describe.runIf(integrationEnabled)("Snapshot PostgreSQL integration", () => {
  const databaseName = `rishi_tdd011_${randomUUID().replaceAll("-", "")}`;
  const sourceUrl = process.env.DATABASE_URL;
  let adminPool: ReturnType<typeof createDatabaseClient>["pool"];
  let databasePool: ReturnType<typeof createDatabaseClient>["pool"];
  let service: SnapshotService;
  let repository: SnapshotRepository;
  let workspaceId: string;
  let otherWorkspaceId: string;
  let projectId: string;
  let otherProjectId: string;
  let assetId: string;

  beforeAll(async () => {
    if (!sourceUrl)
      throw new Error("DATABASE_URL is required when DATABASE_INTEGRATION_TESTS=true.");
    const adminUrl = new URL(sourceUrl);
    adminUrl.pathname = "/postgres";
    const databaseUrl = new URL(sourceUrl);
    databaseUrl.pathname = `/${databaseName}`;
    adminPool = createDatabaseClient(configFor(adminUrl.toString())).pool;
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    await runDatabaseMigrations(databaseUrl.toString());
    const databaseClient = createDatabaseClient(configFor(databaseUrl.toString()));
    databasePool = databaseClient.pool;
    const transactions = new TransactionManager();
    const database = new DatabaseService(databasePool, databaseClient.db, transactions);
    repository = new SnapshotRepository(database, new DrizzleKnowledgeSnapshotRepository(database));
    const logger: ILogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
    service = new SnapshotService(
      repository,
      database,
      transactions,
      new AdvisoryLockService(database, transactions),
      logger
    );

    const userId = randomUUID();
    const otherUserId = randomUUID();
    workspaceId = randomUUID();
    otherWorkspaceId = randomUUID();
    projectId = randomUUID();
    otherProjectId = randomUUID();
    const creatorId = randomUUID();
    assetId = randomUUID();
    await databasePool.query("INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)", [
      userId,
      `${userId}@example.test`,
      otherUserId,
      `${otherUserId}@example.test`,
    ]);
    await databasePool.query(
      "INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3), ($4, $5, $6)",
      [workspaceId, "Snapshot Workspace", userId, otherWorkspaceId, "Other Workspace", otherUserId]
    );
    await databasePool.query(
      "INSERT INTO projects (id, workspace_id, name) VALUES ($1, $2, $3), ($4, $5, $6)",
      [
        projectId,
        workspaceId,
        "Snapshot Project",
        otherProjectId,
        otherWorkspaceId,
        "Other Project",
      ]
    );
    await databasePool.query(
      "INSERT INTO creators (id, workspace_id, name, handle) VALUES ($1, $2, $3, $4)",
      [creatorId, workspaceId, "Snapshot Creator", `creator-${creatorId}`]
    );
    await databasePool.query(
      "INSERT INTO knowledge_assets (id, creator_id, title, storage_path, version_id, status) VALUES ($1, $2, $3, $4, $5, $6)",
      [assetId, creatorId, "Immutable Source", "source.txt", 2, "active"]
    );
    await insertChunks(assetId, ["first frozen chunk", "second frozen chunk"]);
  }, 60_000);

  afterAll(async () => {
    await databasePool?.end();
    if (adminPool) {
      await adminPool.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
        [databaseName]
      );
      await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await adminPool.end();
    }
  });

  async function insertChunks(targetAssetId: string, texts: string[]): Promise<void> {
    const embedding = `[${Array<number>(1536).fill(0.25).join(",")}]`;
    for (const [index, text] of texts.entries()) {
      await databasePool.query(
        "INSERT INTO knowledge_chunks (asset_id, chunk_text, embedding, chunk_index, token_count, embedding_provider, embedding_model, embedding_dimension, embedding_version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          targetAssetId,
          text,
          embedding,
          index,
          text.split(" ").length,
          "controlled",
          "fixture",
          1536,
          "v1",
        ]
      );
    }
  }

  it("creates a complete immutable snapshot and returns it by project", async () => {
    const snapshotId = await service.createProjectAssetSnapshot({ projectId, assetId });
    const snapshot = await service.getProjectAssetSnapshot(projectId, snapshotId);

    expect(snapshot).toMatchObject({
      id: snapshotId,
      projectId,
      assetId,
      title: "Immutable Source",
      capturedVersionId: 2,
      frozenContent: "first frozen chunk\n\nsecond frozen chunk",
    });
    expect(snapshot.chunks.map((chunk) => chunk.chunkText)).toEqual([
      "first frozen chunk",
      "second frozen chunk",
    ]);
    expect(await service.listProjectSnapshots(projectId)).toHaveLength(1);
  });

  it("is idempotent under repeated and concurrent attachment", async () => {
    const existingId = await service.createProjectAssetSnapshot({ projectId, assetId });
    await expect(service.createProjectAssetSnapshot({ projectId, assetId })).resolves.toBe(
      existingId
    );

    const concurrentAssetId = randomUUID();
    await databasePool.query(
      "INSERT INTO knowledge_assets (id, creator_id, title, storage_path, status) SELECT $1, creator_id, $2, $3, $4 FROM knowledge_assets WHERE id = $5",
      [concurrentAssetId, "Concurrent Source", "concurrent.txt", "active", assetId]
    );
    await insertChunks(concurrentAssetId, ["concurrent chunk"]);
    const results = await Promise.allSettled([
      service.createProjectAssetSnapshot({ projectId, assetId: concurrentAssetId }),
      service.createProjectAssetSnapshot({ projectId, assetId: concurrentAssetId }),
    ]);
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    for (const result of results) {
      if (result.status === "rejected")
        expect(result.reason).toBeInstanceOf(SnapshotConflictException);
    }
    const count = await databasePool.query<{ count: string }>(
      "SELECT count(*) FROM knowledge_snapshots WHERE project_id = $1 AND asset_id = $2",
      [projectId, concurrentAssetId]
    );
    expect(Number(count.rows[0]?.count)).toBe(1);
  });

  it("preserves copied content after the source asset and chunks change", async () => {
    const snapshotId = await service.createProjectAssetSnapshot({ projectId, assetId });
    await databasePool.query(
      "UPDATE knowledge_assets SET title = $1, version_id = version_id + 1 WHERE id = $2",
      ["Changed Source", assetId]
    );
    await databasePool.query("UPDATE knowledge_chunks SET chunk_text = $1 WHERE asset_id = $2", [
      "changed content",
      assetId,
    ]);
    const snapshot = await service.getProjectAssetSnapshot(projectId, snapshotId);
    expect(snapshot.title).toBe("Immutable Source");
    expect(snapshot.capturedVersionId).toBe(2);
    expect(snapshot.chunks[0]?.chunkText).toBe("first frozen chunk");
  });

  it("rejects cross-workspace and uncurated source attachment", async () => {
    await expect(
      service.createProjectAssetSnapshot({ projectId: otherProjectId, assetId })
    ).rejects.toBeInstanceOf(SnapshotSourceUnavailableException);

    const emptyAssetId = randomUUID();
    await databasePool.query(
      "INSERT INTO knowledge_assets (id, creator_id, title, storage_path, status) SELECT $1, creator_id, $2, $3, $4 FROM knowledge_assets WHERE id = $5",
      [emptyAssetId, "Empty Source", "empty.txt", "active", assetId]
    );
    await expect(
      service.createProjectAssetSnapshot({ projectId, assetId: emptyAssetId })
    ).rejects.toBeInstanceOf(SnapshotSourceUnavailableException);
  });

  it("rolls back snapshot metadata when chunk replication fails", async () => {
    const rollbackAssetId = randomUUID();
    await databasePool.query(
      "INSERT INTO knowledge_assets (id, creator_id, title, storage_path, status) SELECT $1, creator_id, $2, $3, $4 FROM knowledge_assets WHERE id = $5",
      [rollbackAssetId, "Rollback Source", "rollback.txt", "active", assetId]
    );
    await insertChunks(rollbackAssetId, ["valid chunk", "reject me"]);
    await databasePool.query(`
      CREATE FUNCTION reject_snapshot_chunk() RETURNS trigger AS $$
      BEGIN
        IF NEW.chunk_text = 'reject me' THEN
          RAISE EXCEPTION 'forced snapshot chunk failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await databasePool.query(`
      CREATE TRIGGER reject_snapshot_chunk_trigger
      BEFORE INSERT ON snapshot_chunks
      FOR EACH ROW EXECUTE FUNCTION reject_snapshot_chunk()
    `);
    await expect(
      service.createProjectAssetSnapshot({ projectId, assetId: rollbackAssetId })
    ).rejects.toThrow();
    await databasePool.query("DROP TRIGGER reject_snapshot_chunk_trigger ON snapshot_chunks");
    await databasePool.query("DROP FUNCTION reject_snapshot_chunk()");

    const count = await databasePool.query<{ count: string }>(
      "SELECT count(*) FROM knowledge_snapshots WHERE project_id = $1 AND asset_id = $2",
      [projectId, rollbackAssetId]
    );
    expect(Number(count.rows[0]?.count)).toBe(0);
  });

  it("detaches only through the matching project and cascades copied chunks", async () => {
    const snapshotId = await service.createProjectAssetSnapshot({ projectId, assetId });
    await expect(
      service.removeProjectAssetSnapshot(otherProjectId, snapshotId)
    ).rejects.toBeInstanceOf(SnapshotNotFoundException);
    await service.removeProjectAssetSnapshot(projectId, snapshotId);
    expect(await repository.findById(projectId, snapshotId)).toBeNull();
    const chunkCount = await databasePool.query<{ count: string }>(
      "SELECT count(*) FROM snapshot_chunks WHERE snapshot_id = $1",
      [snapshotId]
    );
    expect(Number(chunkCount.rows[0]?.count)).toBe(0);
  });
});
