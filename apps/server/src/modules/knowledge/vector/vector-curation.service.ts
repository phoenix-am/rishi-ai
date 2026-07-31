import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import { creators, DatabaseService, knowledgeAssets, knowledgeChunks } from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import { TransactionManager } from "@rishi/transaction";
import { and, eq, isNull } from "drizzle-orm";
import { QUEUE_SERVICE, type IQueueService } from "../../../common/queue/index.js";
import { ChunkerService } from "./chunker.service.js";
import { EMBEDDING_PROVIDER, type IEmbeddingProvider } from "./embedding.provider.js";
import {
  curateDocumentInputSchema,
  VECTOR_CURATION_PAYLOAD_VERSION,
  VECTOR_CURATION_SCHEMA_VERSION,
  VECTOR_CURATION_TASK,
  type CurateDocumentInput,
  type VectorCurationResult,
} from "./vector.contracts.js";
import {
  EmbeddingApiException,
  EmbeddingDimensionMismatchException,
  InvalidVectorInputException,
  KnowledgeAssetUnavailableException,
} from "./vector.errors.js";

interface EmbeddedChunk {
  id: string;
  text: string;
  index: number;
  tokenCount: number;
  embedding: number[];
}

@Injectable()
export class VectorCurationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TransactionManager) private readonly transactions: TransactionManager,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddingProvider: IEmbeddingProvider,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    @Inject(ChunkerService) private readonly chunker: ChunkerService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async enqueue(input: CurateDocumentInput, priority = 0): Promise<string> {
    const validated = this.validateInput(input);
    return this.queue.dispatch(
      VECTOR_CURATION_TASK,
      {
        payloadVersion: VECTOR_CURATION_PAYLOAD_VERSION,
        schemaVersion: VECTOR_CURATION_SCHEMA_VERSION,
        data: { ...validated },
      },
      priority
    );
  }

  async curate(
    input: CurateDocumentInput,
    abortSignal?: AbortSignal
  ): Promise<VectorCurationResult> {
    const validated = this.validateInput(input);
    await this.assertAssetAvailable(validated);
    this.assertNotAborted(abortSignal);

    const chunks = this.chunker.splitText(validated.parsedDocument.rawText, {
      maxTokenSize: this.config.get("VECTOR_CHUNK_MAX_TOKENS"),
      overlapTokens: this.config.get("VECTOR_CHUNK_OVERLAP_TOKENS"),
    });
    if (chunks.length === 0) {
      throw new InvalidVectorInputException("Parsed document text must not be empty.");
    }
    if (chunks.length > this.config.get("VECTOR_MAX_CHUNKS")) {
      throw new InvalidVectorInputException("Parsed document exceeds the configured chunk limit.");
    }

    const expectedDimension = this.config.get("VECTOR_EMBEDDING_DIMENSION");
    const providerDimension = this.embeddingProvider.getDimension();
    if (providerDimension !== expectedDimension) {
      throw new EmbeddingDimensionMismatchException(expectedDimension, providerDimension);
    }
    const metadata = this.embeddingProvider.getMetadata();
    if (!metadata.provider.trim() || !metadata.model.trim() || !metadata.version.trim()) {
      throw new InvalidVectorInputException("Embedding provider metadata must be complete.");
    }

    const embeddedChunks: EmbeddedChunk[] = [];
    const batchSize = this.config.get("VECTOR_EMBEDDING_BATCH_SIZE");
    for (let offset = 0; offset < chunks.length; offset += batchSize) {
      this.assertNotAborted(abortSignal);
      const batch = chunks.slice(offset, offset + batchSize);
      const embeddings = await Promise.all(
        batch.map((chunk) => this.generateEmbedding(chunk.text, expectedDimension, abortSignal))
      );
      batch.forEach((chunk, index) => {
        embeddedChunks.push({
          id: this.stableChunkId(
            validated.assetId,
            validated.assetVersion,
            chunk.index,
            chunk.text
          ),
          text: chunk.text,
          index: chunk.index,
          tokenCount: chunk.tokenCount,
          embedding: embeddings[index]!,
        });
      });
    }

    await this.transactions.runInTransaction(this.database.client, async () => {
      await this.assertAssetAvailable(validated);
      await this.database.client
        .delete(knowledgeChunks)
        .where(eq(knowledgeChunks.assetId, validated.assetId));
      await this.database.client.insert(knowledgeChunks).values(
        embeddedChunks.map((chunk) => ({
          id: chunk.id,
          assetId: validated.assetId,
          chunkText: chunk.text,
          embedding: chunk.embedding,
          chunkIndex: chunk.index,
          tokenCount: chunk.tokenCount,
          embeddingProvider: metadata.provider,
          embeddingModel: metadata.model,
          embeddingDimension: expectedDimension,
          embeddingVersion: metadata.version,
        }))
      );
      await this.database.client
        .update(knowledgeAssets)
        .set({ status: "active" })
        .where(eq(knowledgeAssets.id, validated.assetId));
    });

    this.logger.info("Knowledge asset vector curation completed.", {
      assetId: validated.assetId,
      assetVersion: validated.assetVersion,
      chunkCount: embeddedChunks.length,
      embeddingProvider: metadata.provider,
      embeddingModel: metadata.model,
      embeddingVersion: metadata.version,
    });
    return {
      assetId: validated.assetId,
      assetVersion: validated.assetVersion,
      chunkCount: embeddedChunks.length,
    };
  }

  private validateInput(input: CurateDocumentInput): CurateDocumentInput {
    const parsed = curateDocumentInputSchema.safeParse(input);
    if (!parsed.success) throw new InvalidVectorInputException("Vector curation input is invalid.");
    if (
      parsed.data.parsedDocument.rawText.length > this.config.get("VECTOR_MAX_INPUT_CHARACTERS")
    ) {
      throw new InvalidVectorInputException("Parsed document exceeds the configured input limit.");
    }
    return parsed.data;
  }

  private async assertAssetAvailable(input: CurateDocumentInput): Promise<void> {
    const rows = await this.database.client
      .select({ id: knowledgeAssets.id })
      .from(knowledgeAssets)
      .innerJoin(creators, eq(knowledgeAssets.creatorId, creators.id))
      .where(
        and(
          eq(knowledgeAssets.id, input.assetId),
          eq(knowledgeAssets.versionId, input.assetVersion),
          eq(creators.workspaceId, input.workspaceId),
          isNull(knowledgeAssets.deletedAt)
        )
      )
      .limit(1);
    if (rows.length !== 1) throw new KnowledgeAssetUnavailableException();
  }

  private async generateEmbedding(
    text: string,
    expectedDimension: number,
    abortSignal?: AbortSignal
  ): Promise<number[]> {
    this.assertNotAborted(abortSignal);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;
    try {
      const embedding = await Promise.race([
        this.embeddingProvider.generateEmbedding(text),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new EmbeddingApiException("Embedding provider request timed out.")),
            this.config.get("VECTOR_EMBEDDING_TIMEOUT_MS")
          );
        }),
        ...(abortSignal
          ? [
              new Promise<never>((_, reject) => {
                abortListener = () =>
                  reject(new EmbeddingApiException("Embedding request aborted."));
                abortSignal.addEventListener("abort", abortListener, { once: true });
              }),
            ]
          : []),
      ]);
      if (embedding.length !== expectedDimension) {
        throw new EmbeddingDimensionMismatchException(expectedDimension, embedding.length);
      }
      if (embedding.some((value) => !Number.isFinite(value))) {
        throw new InvalidVectorInputException("Embedding provider returned non-finite values.");
      }
      return embedding;
    } catch (error) {
      if (
        error instanceof EmbeddingDimensionMismatchException ||
        error instanceof InvalidVectorInputException ||
        error instanceof EmbeddingApiException
      ) {
        throw error;
      }
      throw new EmbeddingApiException();
    } finally {
      if (timeout) clearTimeout(timeout);
      if (abortSignal && abortListener) abortSignal.removeEventListener("abort", abortListener);
    }
  }

  private assertNotAborted(abortSignal?: AbortSignal): void {
    if (abortSignal?.aborted) throw new EmbeddingApiException("Embedding request aborted.");
  }

  private stableChunkId(
    assetId: string,
    assetVersion: number,
    index: number,
    text: string
  ): string {
    const bytes = createHash("sha256")
      .update(`${assetId}:${assetVersion}:${index}:${text}`)
      .digest()
      .subarray(0, 16);
    bytes[6] = (bytes[6]! & 0x0f) | 0x50;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = bytes.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
