import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import { DatabaseService, knowledgeSnapshots, projects, snapshotChunks } from "@rishi/database";
import { and, asc, cosineDistance, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import type { ISearchService, VectorSearchResult } from "./vector.contracts.js";
import {
  EmbeddingDimensionMismatchException,
  InvalidVectorInputException,
} from "./vector.errors.js";

@Injectable()
export class SearchService implements ISearchService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  async querySemanticChunks(
    projectId: string,
    queryEmbedding: number[],
    limit: number
  ): Promise<VectorSearchResult[]> {
    const parsedProjectId = z.string().uuid().safeParse(projectId);
    if (!parsedProjectId.success) {
      throw new InvalidVectorInputException("Project identifier must be a valid UUID.");
    }
    const validatedProjectId = parsedProjectId.data;
    this.validateEmbedding(queryEmbedding);
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > this.config.get("VECTOR_SEARCH_MAX_RESULTS")
    ) {
      throw new InvalidVectorInputException(
        `Search limit must be between 1 and ${this.config.get("VECTOR_SEARCH_MAX_RESULTS")}.`
      );
    }

    const distance = cosineDistance(snapshotChunks.embedding, queryEmbedding);
    const rows = await this.database.client
      .select({
        chunkId: snapshotChunks.id,
        assetId: knowledgeSnapshots.assetId,
        chunkText: snapshotChunks.chunkText,
        cosineDistance: distance,
      })
      .from(snapshotChunks)
      .innerJoin(knowledgeSnapshots, eq(snapshotChunks.snapshotId, knowledgeSnapshots.id))
      .innerJoin(projects, eq(knowledgeSnapshots.projectId, projects.id))
      .where(and(eq(projects.id, validatedProjectId), isNotNull(knowledgeSnapshots.assetId)))
      .orderBy(asc(distance))
      .limit(limit);

    return rows.flatMap((row) => {
      if (!row.assetId) return [];
      const cosineDistanceValue = Number(row.cosineDistance);
      return [
        {
          chunkId: row.chunkId,
          assetId: row.assetId,
          chunkText: row.chunkText,
          cosineDistance: cosineDistanceValue,
          relevanceScore: (1 - cosineDistanceValue) * 100,
        },
      ];
    });
  }

  private validateEmbedding(embedding: number[]): void {
    const expected = this.config.get("VECTOR_EMBEDDING_DIMENSION");
    if (embedding.length !== expected) {
      throw new EmbeddingDimensionMismatchException(expected, embedding.length);
    }
    if (embedding.some((value) => !Number.isFinite(value))) {
      throw new InvalidVectorInputException("Search embedding must contain only finite numbers.");
    }
  }
}
