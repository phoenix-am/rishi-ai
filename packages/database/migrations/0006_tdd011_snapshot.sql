CREATE UNIQUE INDEX "knowledge_snapshots_project_asset_idx" ON "knowledge_snapshots" USING btree ("project_id","asset_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_snapshots_project_id" ON "knowledge_snapshots" USING btree ("project_id","id");--> statement-breakpoint
ALTER TABLE "knowledge_snapshots" ADD CONSTRAINT "knowledge_snapshots_version_positive" CHECK ("knowledge_snapshots"."captured_version_id" > 0);--> statement-breakpoint
ALTER TABLE "knowledge_snapshots" ADD CONSTRAINT "knowledge_snapshots_title_nonempty" CHECK (length(trim("knowledge_snapshots"."title")) > 0);--> statement-breakpoint
ALTER TABLE "knowledge_snapshots" ADD CONSTRAINT "knowledge_snapshots_content_nonempty" CHECK (length(trim("knowledge_snapshots"."frozen_content")) > 0);