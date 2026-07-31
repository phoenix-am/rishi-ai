import { randomUUID } from "node:crypto";
import { ConfigService } from "@rishi/config";
import { createDatabaseClient, DatabaseService, runDatabaseMigrations } from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import { TransactionManager } from "@rishi/transaction";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { IQueueService } from "../../../common/queue/index.js";
import { ChunkerService } from "./chunker.service.js";
import type { IEmbeddingProvider } from "./embedding.provider.js";
import { SearchService } from "./search.service.js";
import { KnowledgeAssetUnavailableException } from "./vector.errors.js";
import { VectorCurationService } from "./vector-curation.service.js";

const integrationEnabled = process.env.DATABASE_INTEGRATION_TESTS === "true";

function configFor(
  databaseUrl: string,
  vectorOverrides: Record<string, string> = {}
): ConfigService {
  return new ConfigService({
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    JWT_PRIVATE_KEY: "test-private-key",
    JWT_PUBLIC_KEY: "test-public-key",
    ...vectorOverrides,
  });
}

describe.runIf(integrationEnabled)("Vector curation PostgreSQL integration", () => {
  const databaseName = `rishi_tdd010_${randomUUID().replaceAll("-", "")}`;
  const sourceUrl = process.env.DATABASE_URL;
  let adminPool: ReturnType<typeof createDatabaseClient>["pool"];
  let databasePool: ReturnType<typeof createDatabaseClient>["pool"];
  let service: VectorCurationService;
  let search: SearchService;
  let workspaceId: string;
  let assetId: string;
  let projectId: string;

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
    const config = configFor(databaseUrl.toString(), {
      VECTOR_CHUNK_MAX_TOKENS: "3",
      VECTOR_CHUNK_OVERLAP_TOKENS: "1",
      VECTOR_MAX_CHUNKS: "10",
      VECTOR_EMBEDDING_BATCH_SIZE: "2",
    });
    const provider: IEmbeddingProvider = {
      generateEmbedding: async (text) => {
        const vector = Array<number>(1536).fill(0);
        vector[text.includes("alpha") ? 0 : 1] = 1;
        return vector;
      },
      getDimension: () => 1536,
      getMetadata: () => ({ provider: "controlled", model: "fixture", version: "v1" }),
    };
    const logger: ILogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
    service = new VectorCurationService(
      database,
      transactions,
      config,
      provider,
      { dispatch: async () => "unused" } as IQueueService,
      new ChunkerService(),
      logger
    );
    search = new SearchService(database, config);

    const userId = randomUUID();
    workspaceId = randomUUID();
    const creatorId = randomUUID();
    assetId = randomUUID();
    projectId = randomUUID();
    await databasePool.query("INSERT INTO users (id, email) VALUES ($1, $2)", [
      userId,
      `${userId}@example.test`,
    ]);
    await databasePool.query("INSERT INTO workspaces (id, name, owner_id) VALUES ($1, $2, $3)", [
      workspaceId,
      "Vector Workspace",
      userId,
    ]);
    await databasePool.query(
      "INSERT INTO creators (id, workspace_id, name, handle) VALUES ($1, $2, $3, $4)",
      [creatorId, workspaceId, "Vector Creator", `creator-${creatorId}`]
    );
    await databasePool.query(
      "INSERT INTO knowledge_assets (id, creator_id, title, storage_path, status) VALUES ($1, $2, $3, $4, $5)",
      [assetId, creatorId, "Vector Source", "source.txt", "pending"]
    );
    await databasePool.query("INSERT INTO projects (id, workspace_id, name) VALUES ($1, $2, $3)", [
      projectId,
      workspaceId,
      "Vector Project",
    ]);
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

  it("persists versioned vectors idempotently with stable identifiers", async () => {
    const input = {
      assetId,
      workspaceId,
      assetVersion: 1,
      parsedDocument: {
        rawText: "alpha topic context beta topic context",
        metadata: { wordCount: 6, mimeType: "text/plain" },
      },
    };
    await service.curate(input);
    const first = await databasePool.query<{
      id: string;
      chunk_index: number;
      embedding_provider: string;
      embedding_version: string;
    }>(
      "SELECT id, chunk_index, embedding_provider, embedding_version FROM knowledge_chunks WHERE asset_id = $1 ORDER BY chunk_index",
      [assetId]
    );
    await service.curate(input);
    const second = await databasePool.query<{ id: string; chunk_index: number }>(
      "SELECT id, chunk_index FROM knowledge_chunks WHERE asset_id = $1 ORDER BY chunk_index",
      [assetId]
    );

    expect(first.rows).toHaveLength(3);
    expect(second.rows.map((row) => row.id)).toEqual(first.rows.map((row) => row.id));
    expect(first.rows[0]).toMatchObject({
      embedding_provider: "controlled",
      embedding_version: "v1",
    });
    expect(
      await databasePool.query("SELECT status FROM knowledge_assets WHERE id = $1", [assetId])
    ).toMatchObject({ rows: [{ status: "active" }] });
  });

  it("rejects cross-workspace curation", async () => {
    await expect(
      service.curate({
        assetId,
        workspaceId: randomUUID(),
        assetVersion: 1,
        parsedDocument: {
          rawText: "cross tenant attempt",
          metadata: { wordCount: 3, mimeType: "text/plain" },
        },
      })
    ).rejects.toBeInstanceOf(KnowledgeAssetUnavailableException);
  });

  it("rolls back replacement chunks when the final asset update fails", async () => {
    const before = await databasePool.query<{ id: string }>(
      "SELECT id FROM knowledge_chunks WHERE asset_id = $1 ORDER BY chunk_index",
      [assetId]
    );
    await databasePool.query(`
      CREATE FUNCTION reject_vector_activation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced vector activation failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await databasePool.query(`
      CREATE TRIGGER reject_vector_activation_trigger
      BEFORE UPDATE ON knowledge_assets
      FOR EACH ROW EXECUTE FUNCTION reject_vector_activation()
    `);

    await expect(
      service.curate({
        assetId,
        workspaceId,
        assetVersion: 1,
        parsedDocument: {
          rawText: "replacement text that must roll back",
          metadata: { wordCount: 6, mimeType: "text/plain" },
        },
      })
    ).rejects.toThrow();
    await databasePool.query("DROP TRIGGER reject_vector_activation_trigger ON knowledge_assets");
    await databasePool.query("DROP FUNCTION reject_vector_activation() ");

    const after = await databasePool.query<{ id: string }>(
      "SELECT id FROM knowledge_chunks WHERE asset_id = $1 ORDER BY chunk_index",
      [assetId]
    );
    expect(after.rows).toEqual(before.rows);
  });

  it("retrieves only project snapshot chunks by cosine distance", async () => {
    const snapshotId = randomUUID();
    await databasePool.query(
      "INSERT INTO knowledge_snapshots (id, project_id, asset_id, title, captured_version_id, frozen_content) VALUES ($1, $2, $3, $4, $5, $6)",
      [snapshotId, projectId, assetId, "Vector Snapshot", 1, "frozen"]
    );
    await databasePool.query(
      "INSERT INTO snapshot_chunks (id, snapshot_id, chunk_text, embedding, chunk_index, token_count, embedding_provider, embedding_model, embedding_dimension) SELECT id, $1, chunk_text, embedding, chunk_index, token_count, embedding_provider, embedding_model, embedding_dimension FROM knowledge_chunks WHERE asset_id = $2",
      [snapshotId, assetId]
    );
    const query = Array<number>(1536).fill(0);
    query[0] = 1;
    const results = await search.querySemanticChunks(projectId, query, 2);

    expect(results).toHaveLength(2);
    expect(results[0]?.chunkText).toContain("alpha");
    expect(results[0]?.cosineDistance).toBeLessThanOrEqual(results[1]!.cosineDistance);
    expect(await search.querySemanticChunks(randomUUID(), query, 2)).toEqual([]);
  });
});
