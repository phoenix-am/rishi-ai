# TDD-004: Database Module Technical Specification

## 1. Metadata & Status Block

| Metadata Field | Value |
| :--- | :--- |
| **Document ID** | TDD-004 |
| **Module Name** | DatabaseModule |
| **Version** | v1.0.0 |
| **Status** | REVIEW READY |
| **Lifecycle** | Reference |
| **Implementation Status** | Implemented |
| **Owner** | Unassigned |
| **Current Authority** | Level 9 — Technical design reference |
| **Last Verified** | 2026-07-31 |
| **EEP Phase Position** | Phase 2: Core Persistence & Shared Storage Suite (Module 2.1) |
| **Exact Prerequisites** | [TDD-003](TDD-003_Transaction_Module.md) (TransactionModule) |

---

## 2. Technical Architecture Overview

The `DatabaseModule` provisions database connection pooling and houses the Drizzle-mapped PostgreSQL schema definitions. It integrates the `pgvector` extension directly for semantic retrieval, implements composite indexes for multi-tenant containment, and provides isolation drivers.

### File Placement Layout
```text
src/
└── server/
    └── shared/
        └── database/
            ├── database.module.ts     # NestJS database container module
            ├── database.provider.ts   # Drizzle database client pool connection provider
            ├── schema/
            │   ├── index.ts           # Exports all entities
            │   ├── creators.ts        # Creators table schema
            │   ├── projects.ts        # Projects, snapshots, memories & scripts schemas
            │   └── assets.ts          # Knowledge base assets, chunks, and vector schemas
            └── migration/
                └── run-migration.ts   # Database migration startup script
```

### Framework Integration Strategy
- **Client Provider Token:** `DRIZZLE_CLIENT` injection token supplies a pool-bound `NodePgDatabase` client.
- **Eager Bootstrapping:** Database migrations execute synchronously on system startup using `drizzle-kit migrate` commands inside the docker runner, before the NestJS bootstrap completes.

---

## 3. Interface & Contract Specification

### pgvector Custom Schema Type (`assets.ts`)
```typescript
import { customType } from 'drizzle-orm/pg-core';

// Custom type enabling support for pgvector within Drizzle queries
export const pgVector = customType<{ data: number[]; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`; // Default to 1536 dimensions
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return value
        .replace(/[\[\]]/g, '')
        .split(',')
        .map(Number);
    }
    return value as number[];
  },
});
```

---

## 4. Data & Schema Integration

### Relational Schema Mappings (Drizzle Typescript Layout)

```typescript
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { pgVector } from './assets';

// 1. Enums
export const projectStateEnum = pgEnum('project_state', [
  'draft', 'research', 'knowledge_organized', 'working_context_generated', 
  'outline_generated', 'script_generated', 'review', 'exported', 'archived'
]);

export const jobStatusEnum = pgEnum('job_status', [
  'pending', 'processing', 'success', 'failed', 'cancelled'
]);

// 2. Creators (Tenant Root)
export const creators = pgTable('creators', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Knowledge Assets (Mutable Reference Library Roots)
export const knowledgeAssets = pgTable('knowledge_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => creators.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  storagePath: text('storage_path').notNull(),
  versionId: integer('version_id').notNull().default(1),
  deletedAt: timestamp('deleted_at'), // Soft delete anchor
});

// 4. Knowledge Chunks (Granular Ingested Text Vectors)
export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').references(() => knowledgeAssets.id, { onDelete: 'cascade' }).notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: pgVector('embedding', { dimensions: 1536 }).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  tokenCount: integer('token_count').notNull(),
  embeddingProvider: text('embedding_provider').notNull(),
  embeddingModel: text('embedding_model').notNull(),
  embeddingDimension: integer('embedding_dimension').notNull(),
  embeddingVersion: text('embedding_version').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});

// 5. Projects (Workspace Aggregate Container)
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => creators.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  state: text('state').default('draft').notNull(), // Managed via projectStateEnum locally
  version: integer('version').default(1).notNull(), // Optimistic locking
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete anchor
});

// 6. Knowledge Snapshots (Immutable Links to Assets)
export const knowledgeSnapshots = pgTable('knowledge_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  assetId: uuid('asset_id').references(() => knowledgeAssets.id, { onDelete: 'set null' }),
  capturedVersionId: integer('captured_version_id').notNull(),
  attachedAt: timestamp('attached_at').defaultNow().notNull(),
});

// 7. Snapshot Chunks (Immutable Copy of Source Chunks)
export const snapshotChunks = pgTable('snapshot_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  snapshotId: uuid('snapshot_id').references(() => knowledgeSnapshots.id, { onDelete: 'cascade' }).notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: pgVector('embedding', { dimensions: 1536 }).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  tokenCount: integer('token_count').notNull(),
  embeddingProvider: text('embedding_provider').notNull(),
  embeddingModel: text('embedding_model').notNull(),
  embeddingDimension: integer('embedding_dimension').notNull(),
});

// 8. Script Blocks (Modular Editorial Units)
export const scriptBlocks = pgTable('script_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: integer('sort_order').notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  title: text('title').notNull(),
  content: text('content').default('').notNull(),
});

// 9. Script Block Sources (Block context grounding mappings)
export const scriptBlockSources = pgTable('script_block_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockId: uuid('block_id').references(() => scriptBlocks.id, { onDelete: 'cascade' }).notNull(),
  snapshotChunkId: uuid('snapshot_chunk_id').references(() => snapshotChunks.id, { onDelete: 'restrict' }).notNull(),
  relevanceScore: integer('relevance_score').notNull(), // Relevance score * 100
  citationOrder: integer('citation_order').notNull(),
});

// 10. Project Memories (Append-Only Event Streams)
export const projectMemories = pgTable('project_memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').default('{}').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Generation Jobs (AI tracking ledger)
export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  correlationId: uuid('correlation_id').notNull(),
  status: text('status').default('pending').notNull(), // Managed via jobStatusEnum locally
  executionType: text('execution_type').notNull(),
  provider: text('provider').notNull(),
  modelName: text('model_name').notNull(),
  promptTemplateVersion: text('prompt_template_version').notNull(),
  contextVersion: text('context_version').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  errorLog: text('error_log'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  executionDurationMs: integer('execution_duration_ms'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  estimatedCostUsd: text('estimated_cost_usd'),
});
```

### Physical Index & Optimization Constraints
```sql
-- 1. Tenant separation indexing checks
CREATE INDEX idx_projects_creator_id ON projects(creator_id, id) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_assets_creator_id ON knowledge_assets(creator_id, id) WHERE deleted_at IS NULL;

-- 2. Sort ordering index for script blocks
CREATE INDEX idx_script_blocks_sort_order ON script_blocks(project_id, sort_order);

-- 3. pgvector HNSW search performance index matching cosine metric parameters
CREATE INDEX idx_snapshot_chunks_embedding_hnsw 
ON snapshot_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 5. Detailed Lifecycle & Error Matrix

### Schema Verification & DB Interceptor Lifecycle
1. Application boots and validates database connectivity (`pg_isready`).
2. Migration manager checks existing schemas. If schema mismatch is detected, applies diff updates.
3. Repositories querying schemas intercept constraints: if soft-delete applies (`WHERE deleted_at IS NULL`), query outputs are automatically filtered.

### Error Matrix

| Error Code / Name | Failure Type | Triggers / Condition | System Response / Recovery Action |
| :--- | :--- | :--- | :--- |
| `23503` (Foreign Key Violation) | **FATAL** | Deleting a creator directly when reference records remain, or deleting a snapshot chunk mapped to a block source via restrict rules. | PostgreSQL aborts command, Drizzle throws validation exception, transaction rolls back. |
| Vector Dimension Mismatch | **FATAL** | Attempting to insert an array of dimension !== 1536 into `embedding` columns. | Database rejects query execution with code `22000` (Vector size mismatch). |

---

## 6. Testing & Validation Criteria

### Testing Transaction Rollback Script
- Integration tests must run within a test transaction (`BEGIN`). Once assertions complete, tests execute `ROLLBACK` to leave the backing engine database completely clean and unpolluted.

### Vitest Assertions
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pgTable } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { creators, projects } from '../schema';
import { eq } from 'drizzle-orm';

describe('Database Integrity Rollback Execution', () => {
  let pool: Pool;
  let db: any;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rishi_test',
    });
    db = drizzle(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should write entities cleanly and rollback state completely', async () => {
    // Wrap tests in transaction manually to verify rollbacks
    await pool.query('BEGIN');
    try {
      const newCreator = await db.insert(creators).values({
        email: 'integration-test@rishi.ai',
      }).returning();

      const creatorId = newCreator[0].id;

      const newProject = await db.insert(projects).values({
        creatorId,
        title: 'Vedic Civilization Outline',
        state: 'draft',
      }).returning();

      expect(newProject[0].title).toBe('Vedic Civilization Outline');
      expect(newProject[0].creatorId).toBe(creatorId);

      // Verify records exist inside active transaction
      const records = await db.select().from(projects).where(eq(projects.id, newProject[0].id));
      expect(records).toHaveLength(1);
    } finally {
      // Force rollback execution
      await pool.query('ROLLBACK');
    }

    // Verify database remains empty after transaction abort
    const emptyCheck = await db.select().from(creators).where(eq(creators.email, 'integration-test@rishi.ai'));
    expect(emptyCheck).toHaveLength(0);
  });
});
```
