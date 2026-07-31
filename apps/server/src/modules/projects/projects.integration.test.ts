import { randomUUID } from "node:crypto";
import { ConfigService } from "@rishi/config";
import {
  createDatabaseClient,
  DatabaseService,
  DrizzleKnowledgeSnapshotRepository,
  DrizzleProjectRepository,
  runDatabaseMigrations,
} from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import { TransactionManager } from "@rishi/transaction";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AdvisoryLockService } from "../../common/queue/index.js";
import { SnapshotRepository } from "../knowledge/snapshot/repository/snapshot.repository.js";
import { SnapshotService } from "../knowledge/snapshot/snapshot.service.js";
import { OptimisticLockException } from "./errors/optimistic-lock.exception.js";
import { ProjectNotFoundException } from "./errors/project-not-found.exception.js";
import { ProjectsApplicationService } from "./services/projects-application.service.js";

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

describe.runIf(integrationEnabled)("Project Workspace PostgreSQL integration", () => {
  const databaseName = `rishi_tdd012_${randomUUID().replaceAll("-", "")}`;
  const sourceUrl = process.env.DATABASE_URL;
  let adminPool: ReturnType<typeof createDatabaseClient>["pool"];
  let databasePool: ReturnType<typeof createDatabaseClient>["pool"];
  let service: ProjectsApplicationService;
  let workspaceId: string;
  let otherWorkspaceId: string;
  let creatorId: string;

  beforeAll(async () => {
    if (!sourceUrl) {
      throw new Error("DATABASE_URL is required when DATABASE_INTEGRATION_TESTS=true.");
    }
    const adminUrl = new URL(sourceUrl);
    adminUrl.pathname = "/postgres";
    const databaseUrl = new URL(sourceUrl);
    databaseUrl.pathname = `/${databaseName}`;
    adminPool = createDatabaseClient(configFor(adminUrl.toString())).pool;
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    await runDatabaseMigrations(databaseUrl.toString());

    const client = createDatabaseClient(configFor(databaseUrl.toString()));
    databasePool = client.pool;
    const transactions = new TransactionManager();
    const database = new DatabaseService(databasePool, client.db, transactions);
    const projectRepository = new DrizzleProjectRepository(database);
    const snapshotRepository = new SnapshotRepository(
      database,
      new DrizzleKnowledgeSnapshotRepository(database)
    );
    const logger: ILogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
    const snapshots = new SnapshotService(
      snapshotRepository,
      database,
      transactions,
      new AdvisoryLockService(database, transactions),
      logger
    );
    service = new ProjectsApplicationService(
      projectRepository,
      database,
      transactions,
      snapshots,
      logger
    );

    const userId = randomUUID();
    const otherUserId = randomUUID();
    workspaceId = randomUUID();
    otherWorkspaceId = randomUUID();
    creatorId = randomUUID();
    await databasePool.query("INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)", [
      userId,
      `${userId}@example.test`,
      otherUserId,
      `${otherUserId}@example.test`,
    ]);
    await databasePool.query(
      "INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3), ($4, $5, $6)",
      [workspaceId, "Project Workspace", userId, otherWorkspaceId, "Other Workspace", otherUserId]
    );
    await databasePool.query(
      "INSERT INTO creators (id, workspace_id, name, handle) VALUES ($1, $2, $3, $4)",
      [creatorId, workspaceId, "Project Creator", `creator-${creatorId}`]
    );
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

  it("creates a tenant-scoped draft project and lists it deterministically", async () => {
    const created = await service.create(workspaceId, { name: "First Project" });
    expect(created).toMatchObject({ workspaceId, status: "draft", version: 1 });
    const listed = await service.list(workspaceId, { page: 1, limit: 20, sortOrder: "asc" });
    expect(listed.data.some((project) => project.id === created.id)).toBe(true);
    await expect(service.getById(otherWorkspaceId, created.id)).rejects.toBeInstanceOf(
      ProjectNotFoundException
    );
  });

  it("enforces sequential transitions and leaves state unchanged after rejection", async () => {
    const created = await service.create(workspaceId, { name: "Lifecycle Project" });
    const research = await service.transitionProjectState(workspaceId, created.id, {
      targetState: "research",
      expectedVersion: 1,
    });
    expect(research).toMatchObject({ status: "research", version: 2 });
    await expect(
      service.transitionProjectState(workspaceId, created.id, {
        targetState: "script_generated",
        expectedVersion: 2,
      })
    ).rejects.toThrow();
    await expect(service.getById(workspaceId, created.id)).resolves.toMatchObject({
      status: "research",
      version: 2,
    });
  });

  it("allows only one concurrent transition for the same expected version", async () => {
    const created = await service.create(workspaceId, { name: "Concurrent Project" });
    const results = await Promise.allSettled([
      service.transitionProjectState(workspaceId, created.id, {
        targetState: "research",
        expectedVersion: 1,
      }),
      service.transitionProjectState(workspaceId, created.id, {
        targetState: "research",
        expectedVersion: 1,
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" ? rejected.reason : null).toBeInstanceOf(
      OptimisticLockException
    );
  });

  it("archives globally and restores only the captured prior state", async () => {
    const created = await service.create(workspaceId, { name: "Archive Project" });
    const archived = await service.transitionProjectState(workspaceId, created.id, {
      targetState: "archived",
      expectedVersion: 1,
    });
    expect(archived).toMatchObject({ status: "archived", previousState: "draft", version: 2 });
    const restored = await service.transitionProjectState(workspaceId, created.id, {
      targetState: "draft",
      expectedVersion: 2,
    });
    expect(restored).toMatchObject({ status: "draft", previousState: null, version: 3 });
  });

  it("attaches and detaches an immutable curated snapshot through the workspace boundary", async () => {
    const created = await service.create(workspaceId, { name: "Grounded Project" });
    const assetId = randomUUID();
    await databasePool.query(
      "INSERT INTO knowledge_assets (id, creator_id, title, storage_path, version_id, status) VALUES ($1, $2, $3, $4, $5, $6)",
      [assetId, creatorId, "Grounded Source", "grounded.txt", 4, "active"]
    );
    const embedding = `[${Array<number>(1536).fill(0.5).join(",")}]`;
    await databasePool.query(
      "INSERT INTO knowledge_chunks (asset_id, chunk_text, embedding, chunk_index, token_count, embedding_provider, embedding_model, embedding_dimension, embedding_version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [assetId, "immutable grounding", embedding, 0, 2, "controlled", "fixture", 1536, "v1"]
    );

    const snapshot = await service.attachSnapshot(workspaceId, created.id, assetId);
    expect(snapshot).toMatchObject({ projectId: created.id, capturedVersionId: 4 });
    expect(await service.listSnapshots(workspaceId, created.id)).toHaveLength(1);
    await service.detachSnapshot(workspaceId, created.id, snapshot.id);
    expect(await service.listSnapshots(workspaceId, created.id)).toHaveLength(0);
  });
});
