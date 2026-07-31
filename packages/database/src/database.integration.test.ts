import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Project } from "@rishi/domain";
import { TransactionManager } from "@rishi/transaction";
import { DatabaseService, runDatabaseMigrations } from "./index.js";
import { DrizzleProjectRepository } from "./repositories/project.js";

const { Pool } = pg;
const integrationEnabled = process.env.DATABASE_INTEGRATION_TESTS === "true";

describe.runIf(integrationEnabled)("Database PostgreSQL integration", () => {
  const databaseName = `rishi_tdd004_${randomUUID().replaceAll("-", "")}`;
  const sourceUrl = process.env.DATABASE_URL;
  let adminPool: pg.Pool;
  let databasePool: pg.Pool;
  let databaseUrl: URL;

  beforeAll(async () => {
    if (!sourceUrl) {
      throw new Error("DATABASE_URL is required when DATABASE_INTEGRATION_TESTS=true.");
    }

    const adminUrl = new URL(sourceUrl);
    adminUrl.pathname = "/postgres";
    databaseUrl = new URL(sourceUrl);
    databaseUrl.pathname = `/${databaseName}`;

    adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    await runDatabaseMigrations(databaseUrl.toString());
    databasePool = new Pool({ connectionString: databaseUrl.toString(), max: 2 });
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

  it("applies the complete migration chain to a clean database", async () => {
    const tables = await databasePool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tableNames = tables.rows.map((row) => row.table_name);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "creators",
        "generation_jobs",
        "knowledge_assets",
        "knowledge_chunks",
        "knowledge_snapshots",
        "projects",
        "queue_dead_letters",
        "script_block_sources",
        "script_blocks",
        "snapshot_chunks",
      ])
    );

    const indexes = await databasePool.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
    );
    const indexNames = indexes.rows.map((row) => row.indexname);
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "idx_projects_workspace_id",
        "idx_knowledge_assets_creator_id",
        "idx_script_blocks_sort_order",
        "idx_snapshot_chunks_embedding_hnsw",
      ])
    );

    const migrationCount = await databasePool.query<{ count: string }>(
      "SELECT count(*) FROM drizzle.__drizzle_migrations"
    );
    expect(Number(migrationCount.rows[0]?.count)).toBe(6);
  });

  it("enforces database constraints", async () => {
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const creatorId = randomUUID();
    const projectId = randomUUID();

    await databasePool.query("INSERT INTO users (id, email) VALUES ($1, $2)", [
      userId,
      `${userId}@example.test`,
    ]);
    await databasePool.query("INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)", [
      workspaceId,
      "Constraint Test",
      userId,
    ]);

    await expect(
      databasePool.query("INSERT INTO projects (workspace_id, name, status) VALUES ($1, $2, $3)", [
        workspaceId,
        "Invalid State",
        "not_a_project_state",
      ])
    ).rejects.toMatchObject({ code: "22P02" });

    await databasePool.query("INSERT INTO projects (id, workspace_id, name) VALUES ($1, $2, $3)", [
      projectId,
      workspaceId,
      "Constraint Project",
    ]);
    await databasePool.query(
      "INSERT INTO creators (id, workspace_id, name, handle) VALUES ($1, $2, $3, $4)",
      [creatorId, workspaceId, "Constraint Creator", `creator-${creatorId}`]
    );

    await expect(
      databasePool.query(
        "INSERT INTO generation_jobs (project_id, correlation_id, execution_type, provider, model_name, prompt_template_version, context_version, retry_count, started_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())",
        [projectId, randomUUID(), "script", "test", "test", "v1", "v1", -1]
      )
    ).rejects.toMatchObject({ code: "23514" });

    const assetId = randomUUID();
    const snapshotId = randomUUID();
    const snapshotChunkId = randomUUID();
    const blockId = randomUUID();
    const embedding = `[${Array<number>(1536).fill(0).join(",")}]`;

    await databasePool.query(
      "INSERT INTO knowledge_assets (id, creator_id, title, storage_path, status) VALUES ($1, $2, $3, $4, $5)",
      [assetId, creatorId, "Source", "source.txt", "active"]
    );
    await databasePool.query(
      "INSERT INTO knowledge_snapshots (id, project_id, asset_id, title, captured_version_id, frozen_content) VALUES ($1, $2, $3, $4, $5, $6)",
      [snapshotId, projectId, assetId, "Snapshot", 1, "Frozen source"]
    );

    await expect(
      databasePool.query(
        "INSERT INTO snapshot_chunks (snapshot_id, chunk_text, embedding, chunk_index, token_count, embedding_provider, embedding_model, embedding_dimension) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [snapshotId, "Wrong vector", "[0,0]", 0, 2, "test", "test", 1536]
      )
    ).rejects.toMatchObject({ code: "22000" });

    await databasePool.query(
      "INSERT INTO snapshot_chunks (id, snapshot_id, chunk_text, embedding, chunk_index, token_count, embedding_provider, embedding_model, embedding_dimension) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [snapshotChunkId, snapshotId, "Grounding", embedding, 0, 1, "test", "test", 1536]
    );
    await databasePool.query(
      "INSERT INTO script_blocks (id, project_id, sort_order, title) VALUES ($1, $2, $3, $4)",
      [blockId, projectId, 0, "Opening"]
    );
    await databasePool.query(
      "INSERT INTO script_block_sources (block_id, snapshot_chunk_id, relevance_score, citation_order) VALUES ($1, $2, $3, $4)",
      [blockId, snapshotChunkId, 100, 0]
    );

    await expect(
      databasePool.query("DELETE FROM snapshot_chunks WHERE id = $1", [snapshotChunkId])
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("routes repository work through a transaction and rolls it back", async () => {
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const projectId = randomUUID();

    await databasePool.query("INSERT INTO users (id, email) VALUES ($1, $2)", [
      userId,
      `${userId}@example.test`,
    ]);
    await databasePool.query("INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)", [
      workspaceId,
      "Rollback Test",
      userId,
    ]);

    const database = drizzle(databasePool);
    const transactionManager = new TransactionManager();
    const databaseService = new DatabaseService(databasePool, database, transactionManager);
    const repository = new DrizzleProjectRepository(databaseService);
    const rollbackSignal = new Error("force rollback");

    await expect(
      transactionManager.runInTransaction(database, async () => {
        await repository.save(new Project(projectId, workspaceId, "Rollback Project"));
        expect(await repository.exists(projectId)).toBe(true);
        throw rollbackSignal;
      })
    ).rejects.toBe(rollbackSignal);

    expect(await repository.findById(projectId)).toBeNull();
  });
});
