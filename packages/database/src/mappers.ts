import {
  Creator,
  Email,
  CreatorStatus,
  KnowledgeAsset,
  KnowledgeAssetStatus,
  KnowledgeSnapshot,
  ProjectMemory,
  ScriptBlock,
  Project,
  ProjectState,
} from "@rishi/domain";

/**
 * pure transformation mappers converting database rows to domain models and vice versa.
 */

export const CreatorMapper = {
  toDomain(row: { id: string; email: string; status: string; createdAt: Date }): Creator {
    return new Creator(row.id, new Email(row.email), row.status as CreatorStatus, row.createdAt);
  },

  toPersistence(entity: Creator) {
    return {
      id: entity.id,
      email: entity.email,
      status: entity.status,
      createdAt: entity.createdAt,
    };
  },
};

export const AssetMapper = {
  toDomain(row: {
    id: string;
    creatorId: string | null;
    title: string;
    storagePath: string;
    versionId: number;
    status: string;
    deletedAt: Date | null;
  }): KnowledgeAsset {
    return new KnowledgeAsset(
      row.id,
      row.creatorId,
      row.title,
      row.storagePath,
      row.versionId,
      row.status as KnowledgeAssetStatus,
      row.deletedAt
    );
  },

  toPersistence(entity: KnowledgeAsset) {
    return {
      id: entity.id,
      creatorId: entity.creatorId,
      title: entity.title,
      storagePath: entity.storagePath,
      versionId: entity.versionId,
      status: entity.status,
      deletedAt: entity.deletedAt,
    };
  },
};

export const SnapshotMapper = {
  toDomain(row: {
    id: string;
    projectId: string;
    assetId: string | null;
    title: string;
    capturedVersionId: number;
    frozenContent: string;
    attachedAt: Date;
  }): KnowledgeSnapshot {
    return new KnowledgeSnapshot(
      row.id,
      row.projectId,
      row.assetId,
      row.title,
      row.capturedVersionId,
      row.frozenContent,
      row.attachedAt
    );
  },

  toPersistence(entity: KnowledgeSnapshot) {
    return {
      id: entity.id,
      projectId: entity.projectId,
      assetId: entity.assetId,
      title: entity.title,
      capturedVersionId: entity.capturedVersionId,
      frozenContent: entity.frozenContent,
      attachedAt: entity.attachedAt,
    };
  },
};

export const BlockMapper = {
  toDomain(row: {
    id: string;
    projectId: string;
    sortOrder: number;
    isLocked: boolean;
    title: string;
    content: string;
  }): ScriptBlock {
    return new ScriptBlock(
      row.id,
      row.projectId,
      row.sortOrder,
      row.isLocked,
      row.title,
      row.content
    );
  },

  toPersistence(entity: ScriptBlock) {
    return {
      id: entity.id,
      projectId: entity.projectId,
      sortOrder: entity.sortOrder,
      isLocked: entity.isLocked,
      title: entity.title,
      content: entity.content,
    };
  },
};

export const MemoryMapper = {
  toDomain(row: {
    id: string;
    projectId: string;
    eventType: string;
    payload: any;
    createdAt: Date;
  }): ProjectMemory {
    return new ProjectMemory(
      row.id,
      row.projectId,
      row.eventType,
      row.payload as Record<string, any>,
      row.createdAt
    );
  },

  toPersistence(entity: ProjectMemory) {
    return {
      id: entity.id,
      projectId: entity.projectId,
      eventType: entity.eventType,
      payload: entity.payload,
      createdAt: entity.createdAt,
    };
  },
};

export const ProjectMapper = {
  toDomain(
    row: {
      id: string;
      creatorId: string;
      title: string;
      state: string;
      version: number;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      previousState: string | null;
      hasStateDrift: boolean;
    },
    blocksRows: Array<{
      id: string;
      projectId: string;
      sortOrder: number;
      isLocked: boolean;
      title: string;
      content: string;
    }>,
    snapshotRows: Array<{
      id: string;
      projectId: string;
      assetId: string | null;
      title: string;
      capturedVersionId: number;
      frozenContent: string;
      attachedAt: Date;
    }>
  ): Project {
    const project = new Project(
      row.id,
      row.creatorId,
      row.title,
      row.state as ProjectState,
      row.version,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
      row.previousState as ProjectState | null,
      row.hasStateDrift
    );

    const blocks = blocksRows.map((b) => BlockMapper.toDomain(b));
    const snapshots = snapshotRows.map((s) => SnapshotMapper.toDomain(s));

    project.hydrateScriptBlocks(blocks);
    project.hydrateSnapshots(snapshots);

    return project;
  },

  toPersistence(entity: Project) {
    return {
      id: entity.id,
      creatorId: entity.creatorId,
      title: entity.title,
      state: entity.state,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt,
      previousState: entity.previousState,
      hasStateDrift: entity.hasStateDrift,
    };
  },
};
