CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'success', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_state" AS ENUM('draft', 'research', 'knowledge_organized', 'working_context_generated', 'outline_generated', 'script_generated', 'review', 'exported', 'archived');--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"correlation_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"execution_type" text NOT NULL,
	"provider" text NOT NULL,
	"model_name" text NOT NULL,
	"prompt_template_version" text NOT NULL,
	"context_version" text NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_log" text,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"execution_duration_ms" integer,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"estimated_cost_usd" text,
	CONSTRAINT "generation_jobs_retry_count_nonnegative" CHECK ("generation_jobs"."retry_count" >= 0),
	CONSTRAINT "generation_jobs_duration_nonnegative" CHECK ("generation_jobs"."execution_duration_ms" is null or "generation_jobs"."execution_duration_ms" >= 0),
	CONSTRAINT "generation_jobs_prompt_tokens_nonnegative" CHECK ("generation_jobs"."prompt_tokens" is null or "generation_jobs"."prompt_tokens" >= 0),
	CONSTRAINT "generation_jobs_completion_tokens_nonnegative" CHECK ("generation_jobs"."completion_tokens" is null or "generation_jobs"."completion_tokens" >= 0)
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"chunk_index" integer NOT NULL,
	"token_count" integer NOT NULL,
	"embedding_provider" text NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding_dimension" integer NOT NULL,
	"embedding_version" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_chunks_chunk_index_nonnegative" CHECK ("knowledge_chunks"."chunk_index" >= 0),
	CONSTRAINT "knowledge_chunks_token_count_nonnegative" CHECK ("knowledge_chunks"."token_count" >= 0),
	CONSTRAINT "knowledge_chunks_embedding_dimension" CHECK ("knowledge_chunks"."embedding_dimension" = 1536)
);
--> statement-breakpoint
CREATE TABLE "script_block_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"block_id" uuid NOT NULL,
	"snapshot_chunk_id" uuid NOT NULL,
	"relevance_score" integer NOT NULL,
	"citation_order" integer NOT NULL,
	CONSTRAINT "script_block_sources_relevance_score_range" CHECK ("script_block_sources"."relevance_score" >= 0 and "script_block_sources"."relevance_score" <= 100),
	CONSTRAINT "script_block_sources_citation_order_nonnegative" CHECK ("script_block_sources"."citation_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "snapshot_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"chunk_index" integer NOT NULL,
	"token_count" integer NOT NULL,
	"embedding_provider" text NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding_dimension" integer NOT NULL,
	CONSTRAINT "snapshot_chunks_chunk_index_nonnegative" CHECK ("snapshot_chunks"."chunk_index" >= 0),
	CONSTRAINT "snapshot_chunks_token_count_nonnegative" CHECK ("snapshot_chunks"."token_count" >= 0),
	CONSTRAINT "snapshot_chunks_embedding_dimension" CHECK ("snapshot_chunks"."embedding_dimension" = 1536)
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."project_state";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE "public"."project_state" USING "status"::"public"."project_state";--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_asset_id_knowledge_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."knowledge_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_block_sources" ADD CONSTRAINT "script_block_sources_block_id_script_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."script_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_block_sources" ADD CONSTRAINT "script_block_sources_snapshot_chunk_id_snapshot_chunks_id_fk" FOREIGN KEY ("snapshot_chunk_id") REFERENCES "public"."snapshot_chunks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshot_chunks" ADD CONSTRAINT "snapshot_chunks_snapshot_id_knowledge_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."knowledge_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_jobs_project_id_idx" ON "generation_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_correlation_id_idx" ON "generation_jobs" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_chunks_asset_chunk_idx" ON "knowledge_chunks" USING btree ("asset_id","chunk_index");--> statement-breakpoint
CREATE UNIQUE INDEX "script_block_sources_block_chunk_idx" ON "script_block_sources" USING btree ("block_id","snapshot_chunk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_block_sources_citation_order_idx" ON "script_block_sources" USING btree ("block_id","citation_order");--> statement-breakpoint
CREATE UNIQUE INDEX "snapshot_chunks_snapshot_chunk_idx" ON "snapshot_chunks" USING btree ("snapshot_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_snapshot_chunks_embedding_hnsw" ON "snapshot_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "idx_knowledge_assets_creator_id" ON "knowledge_assets" USING btree ("creator_id","id") WHERE "knowledge_assets"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_projects_workspace_id" ON "projects" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_script_blocks_sort_order" ON "script_blocks" USING btree ("project_id","sort_order");--> statement-breakpoint
ALTER TABLE "knowledge_assets" ADD CONSTRAINT "knowledge_assets_version_positive" CHECK ("knowledge_assets"."version_id" > 0);--> statement-breakpoint
ALTER TABLE "script_blocks" ADD CONSTRAINT "script_blocks_sort_order_nonnegative" CHECK ("script_blocks"."sort_order" >= 0);
