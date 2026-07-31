import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "@rishi/database";
import type { ILogger } from "@rishi/logger";
import { TransactionManager } from "@rishi/transaction";
import { AdvisoryLockService } from "../../../common/queue/index.js";
import { SnapshotRepository } from "./repository/snapshot.repository.js";
import {
  snapshotCreationPayloadSchema,
  type ISnapshotService,
  type SnapshotCreationPayload,
  type SnapshotRecord,
} from "./snapshot.contracts.js";
import {
  InvalidSnapshotInputException,
  SnapshotConflictException,
  SnapshotIntegrityException,
  SnapshotNotFoundException,
  SnapshotSourceUnavailableException,
} from "./snapshot.errors.js";

@Injectable()
export class SnapshotService implements ISnapshotService {
  constructor(
    @Inject(SnapshotRepository) private readonly snapshots: SnapshotRepository,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TransactionManager) private readonly transactions: TransactionManager,
    @Inject(AdvisoryLockService) private readonly locks: AdvisoryLockService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async createProjectAssetSnapshot(payload: SnapshotCreationPayload): Promise<string> {
    const parsed = snapshotCreationPayloadSchema.safeParse(payload);
    if (!parsed.success) throw new InvalidSnapshotInputException("Snapshot input is invalid.");

    return this.transactions.runInTransaction<string>(this.database.client, async () => {
      if (!(await this.locks.tryAcquireLock(parsed.data.assetId))) {
        throw new SnapshotConflictException();
      }
      const existing = await this.snapshots.findByProjectAsset(
        parsed.data.projectId,
        parsed.data.assetId
      );
      if (existing) {
        if (existing.chunks.length === 0) throw new SnapshotIntegrityException();
        return existing.id;
      }

      const source = await this.snapshots.findSource(parsed.data.projectId, parsed.data.assetId);
      if (!source || !source.title.trim() || source.chunks.length === 0) {
        throw new SnapshotSourceUnavailableException();
      }

      const result = await this.snapshots.create({
        id: randomUUID(),
        projectId: source.projectId,
        assetId: source.assetId,
        title: source.title,
        capturedVersionId: source.versionId,
        frozenContent: source.chunks.map((chunk) => chunk.chunkText).join("\n\n"),
        chunks: source.chunks,
      });
      if (result.created) {
        this.logger.info("Project knowledge snapshot created.", {
          projectId: source.projectId,
          assetId: source.assetId,
          snapshotId: result.id,
          capturedVersionId: source.versionId,
          chunkCount: source.chunks.length,
        });
      }
      return result.id;
    });
  }

  async removeProjectAssetSnapshot(projectId: string, snapshotId: string): Promise<void> {
    const parsed = snapshotCreationPayloadSchema.safeParse({ projectId, assetId: snapshotId });
    if (!parsed.success)
      throw new InvalidSnapshotInputException("Snapshot identifiers are invalid.");
    await this.transactions.runInTransaction(this.database.client, async () => {
      if (!(await this.snapshots.delete(projectId, snapshotId)))
        throw new SnapshotNotFoundException();
    });
    this.logger.info("Project knowledge snapshot detached.", { projectId, snapshotId });
  }

  async getProjectAssetSnapshot(projectId: string, snapshotId: string): Promise<SnapshotRecord> {
    this.validateIdentifiers(projectId, snapshotId);
    const snapshot = await this.snapshots.findById(projectId, snapshotId);
    if (!snapshot) throw new SnapshotNotFoundException();
    return snapshot;
  }

  async listProjectSnapshots(projectId: string): Promise<SnapshotRecord[]> {
    this.validateIdentifiers(projectId, projectId);
    return this.snapshots.findByProjectId(projectId);
  }

  private validateIdentifiers(projectId: string, snapshotId: string): void {
    const parsed = snapshotCreationPayloadSchema.safeParse({ projectId, assetId: snapshotId });
    if (!parsed.success)
      throw new InvalidSnapshotInputException("Snapshot identifiers are invalid.");
  }
}
