import {
  Creator,
  KnowledgeAsset,
  KnowledgeAssetStatus,
  KnowledgeSnapshot,
  ProjectMemory,
  ScriptBlock,
  Project,
  ContentAsset,
  ContentAssetType,
  Workflow,
  WorkflowRun,
} from "@rishi/domain";

/**
 * pure transformation mappers converting database rows to domain models and vice versa.
 */

export const CreatorMapper = {
  toDomain(row: {
    id: string;
    workspaceId: string;
    name: string;
    handle: string;
    bio: string | null;
    avatarUrl: string | null;
    createdAt: Date;
  }): Creator {
    return new Creator(
      row.id,
      row.workspaceId,
      row.name,
      row.handle,
      row.bio,
      row.avatarUrl,
      row.createdAt
    );
  },

  toPersistence(entity: Creator) {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      name: entity.name,
      handle: entity.handle,
      bio: entity.bio,
      avatarUrl: entity.avatarUrl,
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
  toDomain(row: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    status: string;
    createdAt: Date;
  }): Project {
    return new Project(
      row.id,
      row.workspaceId,
      row.name,
      row.description,
      row.status,
      row.createdAt
    );
  },

  toPersistence(entity: Project) {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      createdAt: entity.createdAt,
    };
  },
};

export const ContentAssetMapper = {
  toDomain(row: {
    id: string;
    projectId: string;
    workspaceId: string;
    type: string;
    contentUrl: string | null;
    textContent: string | null;
    createdAt: Date;
  }): ContentAsset {
    return new ContentAsset(
      row.id,
      row.projectId,
      row.workspaceId,
      row.type as ContentAssetType,
      row.contentUrl,
      row.textContent,
      row.createdAt
    );
  },

  toPersistence(entity: ContentAsset) {
    return {
      id: entity.id,
      projectId: entity.projectId,
      workspaceId: entity.workspaceId,
      type: entity.type,
      contentUrl: entity.contentUrl,
      textContent: entity.textContent,
      createdAt: entity.createdAt,
    };
  },
};

export const WorkflowMapper = {
  toDomain(row: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    triggerType: string;
    definition: any;
    status: string;
    createdAt: Date;
  }): Workflow {
    return new Workflow(
      row.id,
      row.workspaceId,
      row.name,
      row.description,
      row.triggerType,
      row.definition,
      row.status,
      row.createdAt
    );
  },

  toPersistence(entity: Workflow) {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      name: entity.name,
      description: entity.description,
      triggerType: entity.triggerType,
      definition: entity.definition,
      status: entity.status,
      createdAt: entity.createdAt,
    };
  },
};

export const WorkflowRunMapper = {
  toDomain(row: {
    id: string;
    workflowId: string;
    workspaceId: string;
    status: string;
    state: any;
    startedAt: Date;
    completedAt: Date | null;
  }): WorkflowRun {
    return new WorkflowRun(
      row.id,
      row.workflowId,
      row.workspaceId,
      row.status,
      row.state,
      row.startedAt,
      row.completedAt
    );
  },

  toPersistence(entity: WorkflowRun) {
    return {
      id: entity.id,
      workflowId: entity.workflowId,
      workspaceId: entity.workspaceId,
      status: entity.status,
      state: entity.state,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
    };
  },
};
