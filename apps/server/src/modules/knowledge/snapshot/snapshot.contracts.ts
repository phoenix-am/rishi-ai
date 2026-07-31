import { z } from "zod";

export interface SnapshotCreationPayload {
  projectId: string;
  assetId: string;
}

export interface SnapshotChunkRecord {
  id: string;
  snapshotId: string;
  chunkText: string;
  embedding: number[];
  chunkIndex: number;
  tokenCount: number;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimension: number;
}

export interface SnapshotRecord {
  id: string;
  projectId: string;
  assetId: string | null;
  title: string;
  capturedVersionId: number;
  frozenContent: string;
  attachedAt: Date;
  chunks: SnapshotChunkRecord[];
}

export interface ISnapshotService {
  createProjectAssetSnapshot(payload: SnapshotCreationPayload): Promise<string>;
  removeProjectAssetSnapshot(projectId: string, snapshotId: string): Promise<void>;
}

export const snapshotCreationPayloadSchema = z.object({
  projectId: z.string().uuid(),
  assetId: z.string().uuid(),
});
