ALTER TABLE "projects" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "previous_state" "project_state";--> statement-breakpoint
UPDATE "projects" SET "previous_state" = 'draft' WHERE "status" = 'archived' AND "previous_state" IS NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "has_state_drift" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_version_positive" CHECK ("projects"."version" > 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_name_nonempty" CHECK (length(trim("projects"."name")) > 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_previous_state_archived_only" CHECK ((("projects"."status" = 'archived' AND "projects"."previous_state" IS NOT NULL AND "projects"."previous_state" <> 'archived') OR ("projects"."status" <> 'archived' AND "projects"."previous_state" IS NULL)));
