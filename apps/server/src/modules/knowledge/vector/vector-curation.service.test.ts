import type { ConfigService, EnvConfig } from "@rishi/config";
import type { DatabaseService } from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import type { TransactionManager } from "@rishi/transaction";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IQueueService } from "../../../common/queue/index.js";
import { ChunkerService } from "./chunker.service.js";
import type { IEmbeddingProvider } from "./embedding.provider.js";
import { VECTOR_CURATION_TASK, type CurateDocumentInput } from "./vector.contracts.js";
import { EmbeddingApiException, KnowledgeAssetUnavailableException } from "./vector.errors.js";
import { VectorCurationService } from "./vector-curation.service.js";

const assetId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const input: CurateDocumentInput = {
  assetId,
  workspaceId,
  assetVersion: 1,
  parsedDocument: {
    rawText: "one two three four five six",
    metadata: { wordCount: 6, mimeType: "text/plain" },
  },
};

function createConfig(overrides: Partial<EnvConfig> = {}): ConfigService {
  const values: Partial<EnvConfig> = {
    VECTOR_CHUNK_MAX_TOKENS: 4,
    VECTOR_CHUNK_OVERLAP_TOKENS: 2,
    VECTOR_MAX_INPUT_CHARACTERS: 1_000,
    VECTOR_MAX_CHUNKS: 10,
    VECTOR_EMBEDDING_BATCH_SIZE: 2,
    VECTOR_EMBEDDING_TIMEOUT_MS: 1_000,
    VECTOR_EMBEDDING_DIMENSION: 1536,
    ...overrides,
  };
  return {
    get: <T extends keyof EnvConfig>(key: T) => values[key] as EnvConfig[T],
  } as ConfigService;
}

function createDatabase(assetExists = true) {
  const inserted: Array<Record<string, unknown>> = [];
  const select = vi.fn(() => ({
    from: () => ({
      innerJoin: () => ({
        where: () => ({ limit: async () => (assetExists ? [{ id: assetId }] : []) }),
      }),
    }),
  }));
  const client = {
    select,
    delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
    insert: vi.fn(() => ({
      values: vi.fn(async (values: Array<Record<string, unknown>>) => inserted.push(...values)),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
    })),
  };
  return { database: { client } as unknown as DatabaseService, client, inserted };
}

describe("VectorCurationService", () => {
  let provider: IEmbeddingProvider;
  let queue: IQueueService;
  let logger: ILogger;
  let transactions: TransactionManager;

  beforeEach(() => {
    provider = {
      generateEmbedding: vi.fn(async () => Array<number>(1536).fill(0.25)),
      getDimension: () => 1536,
      getMetadata: () => ({ provider: "controlled", model: "fixture", version: "v1" }),
    };
    queue = { dispatch: vi.fn(async () => "job-1") };
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    transactions = {
      runInTransaction: vi.fn(async (_client, work: () => Promise<unknown>) => work()),
    } as unknown as TransactionManager;
  });

  it("curates deterministic chunks and replaces asset vectors transactionally", async () => {
    const { database, client, inserted } = createDatabase();
    const service = new VectorCurationService(
      database,
      transactions,
      createConfig(),
      provider,
      queue,
      new ChunkerService(),
      logger
    );

    const result = await service.curate(input);
    expect(result).toEqual({ assetId, assetVersion: 1, chunkCount: 2 });
    expect(provider.generateEmbedding).toHaveBeenCalledTimes(2);
    expect(client.delete).toHaveBeenCalledOnce();
    expect(client.insert).toHaveBeenCalledOnce();
    expect(client.update).toHaveBeenCalledOnce();
    expect(inserted.map((row) => row.chunkIndex)).toEqual([0, 1]);
    expect(inserted[0]?.embeddingProvider).toBe("controlled");
    expect(inserted[0]?.embeddingVersion).toBe("v1");
    expect(inserted[0]?.id).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it("dispatches a versioned queue payload", async () => {
    const { database } = createDatabase();
    const service = new VectorCurationService(
      database,
      transactions,
      createConfig(),
      provider,
      queue,
      new ChunkerService(),
      logger
    );

    await expect(service.enqueue(input)).resolves.toBe("job-1");
    expect(queue.dispatch).toHaveBeenCalledWith(
      VECTOR_CURATION_TASK,
      expect.objectContaining({ payloadVersion: "1.0.0", schemaVersion: "1" }),
      0
    );
  });

  it("rejects cross-workspace or stale assets before embedding", async () => {
    const { database } = createDatabase(false);
    const service = new VectorCurationService(
      database,
      transactions,
      createConfig(),
      provider,
      queue,
      new ChunkerService(),
      logger
    );

    await expect(service.curate(input)).rejects.toBeInstanceOf(KnowledgeAssetUnavailableException);
    expect(provider.generateEmbedding).not.toHaveBeenCalled();
  });

  it("classifies provider failures without persisting partial chunks", async () => {
    const { database, client } = createDatabase();
    provider.generateEmbedding = vi.fn(async () => {
      throw new Error("provider unavailable");
    });
    const service = new VectorCurationService(
      database,
      transactions,
      createConfig(),
      provider,
      queue,
      new ChunkerService(),
      logger
    );

    await expect(service.curate(input)).rejects.toBeInstanceOf(EmbeddingApiException);
    expect(client.delete).not.toHaveBeenCalled();
    expect(client.insert).not.toHaveBeenCalled();
  });

  it("rejects provider and response dimensions that do not match persistence", async () => {
    const { database } = createDatabase();
    provider.getDimension = () => 384;
    const incompatibleProviderService = new VectorCurationService(
      database,
      transactions,
      createConfig(),
      provider,
      queue,
      new ChunkerService(),
      logger
    );
    await expect(incompatibleProviderService.curate(input)).rejects.toThrow(
      "expected 1536, received 384"
    );

    provider.getDimension = () => 1536;
    provider.generateEmbedding = vi.fn(async () => [0, 1]);
    const incompatibleResponseService = new VectorCurationService(
      database,
      transactions,
      createConfig(),
      provider,
      queue,
      new ChunkerService(),
      logger
    );
    await expect(incompatibleResponseService.curate(input)).rejects.toThrow(
      "expected 1536, received 2"
    );
  });

  it("bounds embedding concurrency by configured batches", async () => {
    const { database } = createDatabase();
    let active = 0;
    let peak = 0;
    provider.generateEmbedding = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      return Array<number>(1536).fill(0);
    });
    const service = new VectorCurationService(
      database,
      transactions,
      createConfig({ VECTOR_EMBEDDING_BATCH_SIZE: 1 }),
      provider,
      queue,
      new ChunkerService(),
      logger
    );

    await service.curate(input);
    expect(peak).toBe(1);
  });

  it("treats provider timeouts and cancellation as transient provider failures", async () => {
    const { database } = createDatabase();
    provider.generateEmbedding = vi.fn(() => new Promise<number[]>(() => undefined));
    const service = new VectorCurationService(
      database,
      transactions,
      createConfig({ VECTOR_EMBEDDING_TIMEOUT_MS: 1 }),
      provider,
      queue,
      new ChunkerService(),
      logger
    );
    await expect(service.curate(input)).rejects.toBeInstanceOf(EmbeddingApiException);

    const controller = new AbortController();
    controller.abort();
    await expect(service.curate(input, controller.signal)).rejects.toBeInstanceOf(
      EmbeddingApiException
    );
  });
});
