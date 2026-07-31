import { z } from "zod";
import type { ParsedDocument } from "../parsing/index.js";

export const VECTOR_CURATION_TASK = "vector_curation";
export const VECTOR_CURATION_PAYLOAD_VERSION = "1.0.0";
export const VECTOR_CURATION_SCHEMA_VERSION = "1";

export interface ChunkerConfig {
  maxTokenSize: number;
  overlapTokens: number;
}

export interface ChunkPayload {
  text: string;
  index: number;
  tokenCount: number;
}

export interface CurateDocumentInput {
  assetId: string;
  workspaceId: string;
  assetVersion: number;
  parsedDocument: ParsedDocument;
}

export interface VectorCurationResult {
  assetId: string;
  assetVersion: number;
  chunkCount: number;
}

export interface VectorSearchResult {
  chunkId: string;
  assetId: string;
  chunkText: string;
  cosineDistance: number;
  relevanceScore: number;
}

export interface ISearchService {
  querySemanticChunks(
    projectId: string,
    queryEmbedding: number[],
    limit: number
  ): Promise<VectorSearchResult[]>;
}

const parsedDocumentSchema = z.object({
  rawText: z.string(),
  metadata: z.object({
    pageCount: z.number().int().positive().optional(),
    wordCount: z.number().int().nonnegative(),
    title: z.string().optional(),
    extractedAuthor: z.string().optional(),
    mimeType: z.string().trim().min(1),
  }),
});

export const curateDocumentInputSchema = z.object({
  assetId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  assetVersion: z.number().int().positive(),
  parsedDocument: parsedDocumentSchema,
});
