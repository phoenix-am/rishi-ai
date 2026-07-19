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
} from "drizzle-orm/pg-core";

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
export const knowledgeAssets = pgTable("knowledge_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").references(() => creators.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  storagePath: text("storage_path").notNull(),
  versionId: integer("version_id").default(1).notNull(),
  status: text("status").notNull(),
  deletedAt: timestamp("deleted_at"),
});

/**
 * Database schema for Projects.
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .references(() => creators.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  state: text("state").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  previousState: text("previous_state"),
  hasStateDrift: boolean("has_state_drift").default(false).notNull(),
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
 * Database schema for Script Blocks.
 */
export const scriptBlocks = pgTable("script_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  sortOrder: integer("sort_order").notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  title: text("title").notNull(),
  content: text("content").default("").notNull(),
});

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

// Import relations from drizzle-orm
import { relations } from "drizzle-orm";

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

export const creatorsRelations = relations(creators, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [creators.workspaceId],
    references: [workspaces.id],
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
}));
