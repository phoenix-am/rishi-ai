import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  check,
  pgEnum,
  vector,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const projectStateEnum = pgEnum("project_state", [
  "draft",
  "research",
  "knowledge_organized",
  "working_context_generated",
  "outline_generated",
  "script_generated",
  "review",
  "exported",
  "archived",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "success",
  "failed",
  "cancelled",
]);

/**
 * Database schema for Creators.
 */
export const creators = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Database schema for Knowledge Library Assets.
 */
export const knowledgeAssets = pgTable(
  "knowledge_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id").references(() => creators.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    storagePath: text("storage_path").notNull(),
    versionId: integer("version_id").default(1).notNull(),
    status: text("status").notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_knowledge_assets_creator_id")
      .on(t.creatorId, t.id)
      .where(sql`${t.deletedAt} is null`),
    check("knowledge_assets_version_positive", sql`${t.versionId} > 0`),
  ]
);

/**
 * Granular, embedded text segments belonging to a knowledge asset version.
 */
export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .references(() => knowledgeAssets.id, { onDelete: "cascade" })
      .notNull(),
    chunkText: text("chunk_text").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    tokenCount: integer("token_count").notNull(),
    embeddingProvider: text("embedding_provider").notNull(),
    embeddingModel: text("embedding_model").notNull(),
    embeddingDimension: integer("embedding_dimension").notNull(),
    embeddingVersion: text("embedding_version").notNull(),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("knowledge_chunks_asset_chunk_idx").on(t.assetId, t.chunkIndex),
    check("knowledge_chunks_chunk_index_nonnegative", sql`${t.chunkIndex} >= 0`),
    check("knowledge_chunks_token_count_nonnegative", sql`${t.tokenCount} >= 0`),
    check("knowledge_chunks_embedding_dimension", sql`${t.embeddingDimension} = 1536`),
  ]
);

/**
 * Database schema for Projects.
 */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStateEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_projects_workspace_id").on(t.workspaceId, t.id)]
);

/**
 * Database schema for Content Assets.
 */
export const contentAssets = pgTable("content_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // enum: SCRIPT, AUDIO, VIDEO, IMAGE
  contentUrl: text("content_url"),
  textContent: text("text_content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Database schema for Knowledge Snapshots frozen inside projects.
 */
export const knowledgeSnapshots = pgTable("knowledge_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  assetId: uuid("asset_id").references(() => knowledgeAssets.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  capturedVersionId: integer("captured_version_id").notNull(),
  frozenContent: text("frozen_content").notNull(),
  attachedAt: timestamp("attached_at").defaultNow().notNull(),
});

/**
 * Immutable embedded chunk copies captured for a project snapshot.
 */
export const snapshotChunks = pgTable(
  "snapshot_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: uuid("snapshot_id")
      .references(() => knowledgeSnapshots.id, { onDelete: "cascade" })
      .notNull(),
    chunkText: text("chunk_text").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    tokenCount: integer("token_count").notNull(),
    embeddingProvider: text("embedding_provider").notNull(),
    embeddingModel: text("embedding_model").notNull(),
    embeddingDimension: integer("embedding_dimension").notNull(),
  },
  (t) => [
    uniqueIndex("snapshot_chunks_snapshot_chunk_idx").on(t.snapshotId, t.chunkIndex),
    index("idx_snapshot_chunks_embedding_hnsw")
      .using("hnsw", t.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
    check("snapshot_chunks_chunk_index_nonnegative", sql`${t.chunkIndex} >= 0`),
    check("snapshot_chunks_token_count_nonnegative", sql`${t.tokenCount} >= 0`),
    check("snapshot_chunks_embedding_dimension", sql`${t.embeddingDimension} = 1536`),
  ]
);

/**
 * Database schema for Script Blocks.
 */
export const scriptBlocks = pgTable(
  "script_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    sortOrder: integer("sort_order").notNull(),
    isLocked: boolean("is_locked").default(false).notNull(),
    title: text("title").notNull(),
    content: text("content").default("").notNull(),
  },
  (t) => [
    uniqueIndex("idx_script_blocks_sort_order").on(t.projectId, t.sortOrder),
    check("script_blocks_sort_order_nonnegative", sql`${t.sortOrder} >= 0`),
  ]
);

/**
 * Citation links grounding a script block in immutable snapshot chunks.
 */
export const scriptBlockSources = pgTable(
  "script_block_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockId: uuid("block_id")
      .references(() => scriptBlocks.id, { onDelete: "cascade" })
      .notNull(),
    snapshotChunkId: uuid("snapshot_chunk_id")
      .references(() => snapshotChunks.id, { onDelete: "restrict" })
      .notNull(),
    relevanceScore: integer("relevance_score").notNull(),
    citationOrder: integer("citation_order").notNull(),
  },
  (t) => [
    uniqueIndex("script_block_sources_block_chunk_idx").on(t.blockId, t.snapshotChunkId),
    uniqueIndex("script_block_sources_citation_order_idx").on(t.blockId, t.citationOrder),
    check(
      "script_block_sources_relevance_score_range",
      sql`${t.relevanceScore} >= 0 and ${t.relevanceScore} <= 100`
    ),
    check("script_block_sources_citation_order_nonnegative", sql`${t.citationOrder} >= 0`),
  ]
);

/**
 * Database schema for Project Memories history log.
 */
export const projectMemories = pgTable("project_memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Durable execution ledger for AI generation work. Queue execution remains outside this package.
 */
export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    correlationId: uuid("correlation_id").notNull(),
    status: jobStatusEnum("status").default("pending").notNull(),
    executionType: text("execution_type").notNull(),
    provider: text("provider").notNull(),
    modelName: text("model_name").notNull(),
    promptTemplateVersion: text("prompt_template_version").notNull(),
    contextVersion: text("context_version").notNull(),
    retryCount: integer("retry_count").default(0).notNull(),
    errorLog: text("error_log"),
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
    executionDurationMs: integer("execution_duration_ms"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    estimatedCostUsd: text("estimated_cost_usd"),
  },
  (t) => [
    index("generation_jobs_project_id_idx").on(t.projectId),
    uniqueIndex("generation_jobs_correlation_id_idx").on(t.correlationId),
    check("generation_jobs_retry_count_nonnegative", sql`${t.retryCount} >= 0`),
    check(
      "generation_jobs_duration_nonnegative",
      sql`${t.executionDurationMs} is null or ${t.executionDurationMs} >= 0`
    ),
    check(
      "generation_jobs_prompt_tokens_nonnegative",
      sql`${t.promptTokens} is null or ${t.promptTokens} >= 0`
    ),
    check(
      "generation_jobs_completion_tokens_nonnegative",
      sql`${t.completionTokens} is null or ${t.completionTokens} >= 0`
    ),
  ]
);

/**
 * Database schema for Users.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Database schema for Workspaces.
 */
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
});

/**
 * Database schema for Workspace Members.
 */
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.workspaceId] }),
  })
);

/**
 * Database schema for Sessions.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    deviceMetadata: jsonb("device_metadata").default({}).notNull(),
  },
  (t) => ({
    refreshTokenHashIdx: index("refresh_token_hash_idx").on(t.refreshTokenHash),
  })
);

/**
 * Relations definitions for user, workspace, membership, and session tables.
 */
export const usersRelations = relations(users, ({ many }) => ({
  workspaceMemberships: many(workspaceMembers),
  sessions: many(sessions),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  workspaceMembers: many(workspaceMembers),
  creators: many(creators),
  projects: many(projects),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const creatorsRelations = relations(creators, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [creators.workspaceId],
    references: [workspaces.id],
  }),
  knowledgeAssets: many(knowledgeAssets),
}));

export const knowledgeAssetsRelations = relations(knowledgeAssets, ({ one, many }) => ({
  creator: one(creators, {
    fields: [knowledgeAssets.creatorId],
    references: [creators.id],
  }),
  chunks: many(knowledgeChunks),
  snapshots: many(knowledgeSnapshots),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  asset: one(knowledgeAssets, {
    fields: [knowledgeChunks.assetId],
    references: [knowledgeAssets.id],
  }),
}));

/**
 * Database schema for Workflows.
 */
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(),
  definition: jsonb("definition").$type<any>().notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Database schema for Workflow Runs.
 */
export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .references(() => workflows.id, { onDelete: "cascade" })
    .notNull(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  status: text("status").notNull().default("PENDING"),
  state: jsonb("state").$type<any>().notNull().default({ inputs: {}, outputs: {} }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workflows.workspaceId],
    references: [workspaces.id],
  }),
  workflowRuns: many(workflowRuns),
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowRuns.workflowId],
    references: [workflows.id],
  }),
  workspace: one(workspaces, {
    fields: [workflowRuns.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [workflowRuns.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  contentAssets: many(contentAssets),
  knowledgeSnapshots: many(knowledgeSnapshots),
  scriptBlocks: many(scriptBlocks),
  projectMemories: many(projectMemories),
  generationJobs: many(generationJobs),
}));

export const knowledgeSnapshotsRelations = relations(knowledgeSnapshots, ({ one, many }) => ({
  project: one(projects, {
    fields: [knowledgeSnapshots.projectId],
    references: [projects.id],
  }),
  asset: one(knowledgeAssets, {
    fields: [knowledgeSnapshots.assetId],
    references: [knowledgeAssets.id],
  }),
  chunks: many(snapshotChunks),
}));

export const snapshotChunksRelations = relations(snapshotChunks, ({ one, many }) => ({
  snapshot: one(knowledgeSnapshots, {
    fields: [snapshotChunks.snapshotId],
    references: [knowledgeSnapshots.id],
  }),
  scriptBlockSources: many(scriptBlockSources),
}));

export const scriptBlocksRelations = relations(scriptBlocks, ({ one, many }) => ({
  project: one(projects, {
    fields: [scriptBlocks.projectId],
    references: [projects.id],
  }),
  sources: many(scriptBlockSources),
}));

export const scriptBlockSourcesRelations = relations(scriptBlockSources, ({ one }) => ({
  block: one(scriptBlocks, {
    fields: [scriptBlockSources.blockId],
    references: [scriptBlocks.id],
  }),
  snapshotChunk: one(snapshotChunks, {
    fields: [scriptBlockSources.snapshotChunkId],
    references: [snapshotChunks.id],
  }),
}));

export const projectMemoriesRelations = relations(projectMemories, ({ one }) => ({
  project: one(projects, {
    fields: [projectMemories.projectId],
    references: [projects.id],
  }),
}));

export const generationJobsRelations = relations(generationJobs, ({ one }) => ({
  project: one(projects, {
    fields: [generationJobs.projectId],
    references: [projects.id],
  }),
}));

export const contentAssetsRelations = relations(contentAssets, ({ one }) => ({
  project: one(projects, {
    fields: [contentAssets.projectId],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [contentAssets.workspaceId],
    references: [workspaces.id],
  }),
}));
