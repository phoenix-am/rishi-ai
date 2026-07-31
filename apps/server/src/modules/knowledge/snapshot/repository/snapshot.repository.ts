import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  creators,
  DatabaseService,
  knowledgeAssets,
  knowledgeChunks,
  projects,
  snapshotChunks,
} from "@rishi/database";
import {
  KNOWLEDGE_SNAPSHOT_REPOSITORY,
  KnowledgeSnapshot,
  type IKnowledgeSnapshotRepository,
} from "@rishi/domain";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import type { SnapshotChunkRecord, SnapshotRecord } from "../snapshot.contracts.js";
import { SnapshotImmutableException } from "../snapshot.errors.js";

export interface SnapshotSource {
  projectId: string;
  assetId: string;
  title: string;
  versionId: number;
  chunks: Array<{
    chunkText: string;
    embedding: number[];
    chunkIndex: number;
    tokenCount: number;
    embeddingProvider: string;
    embeddingModel: string;
    embeddingDimension: number;
  }>;
}

export interface CreateSnapshotRecordInput {
  id: string;
  projectId: string;
  assetId: string;
  title: string;
  capturedVersionId: number;
  frozenContent: string;
  chunks: SnapshotSource["chunks"];
}

@Injectable()
export class SnapshotRepository {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(KNOWLEDGE_SNAPSHOT_REPOSITORY)
    private readonly metadata: IKnowledgeSnapshotRepository
  ) {}

  async findSource(projectId: string, assetId: string): Promise<SnapshotSource | null> {
    const sourceRows = await this.database.client
      .select({
        projectId: projects.id,
        assetId: knowledgeAssets.id,
        title: knowledgeAssets.title,
        versionId: knowledgeAssets.versionId,
      })
      .from(projects)
      .innerJoin(knowledgeAssets, eq(knowledgeAssets.id, assetId))
      .leftJoin(creators, eq(knowledgeAssets.creatorId, creators.id))
      .where(
        and(
          eq(projects.id, projectId),
          eq(knowledgeAssets.id, assetId),
          eq(knowledgeAssets.status, "active"),
          isNull(knowledgeAssets.deletedAt),
          or(isNull(knowledgeAssets.creatorId), eq(creators.workspaceId, projects.workspaceId))
        )
      )
      .limit(1);
    const source = sourceRows[0];
    if (!source) return null;

    const chunks = await this.database.client
      .select({
        chunkText: knowledgeChunks.chunkText,
        embedding: knowledgeChunks.embedding,
        chunkIndex: knowledgeChunks.chunkIndex,
        tokenCount: knowledgeChunks.tokenCount,
        embeddingProvider: knowledgeChunks.embeddingProvider,
        embeddingModel: knowledgeChunks.embeddingModel,
        embeddingDimension: knowledgeChunks.embeddingDimension,
      })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.assetId, assetId))
      .orderBy(asc(knowledgeChunks.chunkIndex));
    return { ...source, chunks };
  }

  async findByProjectAsset(projectId: string, assetId: string): Promise<SnapshotRecord | null> {
    const snapshot = await this.metadata.findByProjectAsset(projectId, assetId);
    return snapshot ? this.attachChunks(snapshot) : null;
  }

  async findById(projectId: string, snapshotId: string): Promise<SnapshotRecord | null> {
    const snapshot = await this.metadata.findById(snapshotId);
    return snapshot?.projectId === projectId ? this.attachChunks(snapshot) : null;
  }

  async findByProjectId(projectId: string): Promise<SnapshotRecord[]> {
    const snapshots = await this.metadata.findByProjectId(projectId);
    if (snapshots.length === 0) return [];
    const chunks = await this.database.client
      .select()
      .from(snapshotChunks)
      .where(
        inArray(
          snapshotChunks.snapshotId,
          snapshots.map((snapshot) => snapshot.id)
        )
      )
      .orderBy(asc(snapshotChunks.snapshotId), asc(snapshotChunks.chunkIndex));
    return snapshots
      .sort(
        (left, right) =>
          left.attachedAt.getTime() - right.attachedAt.getTime() || left.id.localeCompare(right.id)
      )
      .map((snapshot) => ({
        ...this.toRecord(snapshot),
        chunks: chunks.filter((chunk) => chunk.snapshotId === snapshot.id),
      }));
  }

  async create(input: CreateSnapshotRecordInput): Promise<{ id: string; created: boolean }> {
    await this.metadata.save(
      new KnowledgeSnapshot(
        input.id,
        input.projectId,
        input.assetId,
        input.title,
        input.capturedVersionId,
        input.frozenContent
      )
    );

    await this.database.client.insert(snapshotChunks).values(
      input.chunks.map((chunk) => ({
        id: randomUUID(),
        snapshotId: input.id,
        ...chunk,
      }))
    );
    return { id: input.id, created: true };
  }

  async delete(projectId: string, snapshotId: string): Promise<boolean> {
    return this.metadata.delete(projectId, snapshotId);
  }

  update(): never {
    throw new SnapshotImmutableException();
  }

  private async attachChunks(snapshot: KnowledgeSnapshot): Promise<SnapshotRecord> {
    const chunks = await this.database.client
      .select()
      .from(snapshotChunks)
      .where(eq(snapshotChunks.snapshotId, snapshot.id))
      .orderBy(asc(snapshotChunks.chunkIndex));
    return { ...this.toRecord(snapshot), chunks: chunks as SnapshotChunkRecord[] };
  }

  private toRecord(snapshot: KnowledgeSnapshot): Omit<SnapshotRecord, "chunks"> {
    return {
      id: snapshot.id,
      projectId: snapshot.projectId,
      assetId: snapshot.assetId,
      title: snapshot.title,
      capturedVersionId: snapshot.capturedVersionId,
      frozenContent: snapshot.frozenContent,
      attachedAt: snapshot.attachedAt,
    };
  }
}
