import { pgTable, uuid, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * Database schema for Creators.
 */
export const creators = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  status: text("status").notNull(),
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
