DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM creators LIMIT 1) OR EXISTS (SELECT 1 FROM projects LIMIT 1) THEN
    RAISE EXCEPTION '0003_phase9 cannot infer workspace ownership for legacy creator/project rows; migrate that data before applying this schema migration';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_creator_id_creators_id_fk";
--> statement-breakpoint
ALTER TABLE "creators" DROP CONSTRAINT "creators_email_unique";
--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "workspace_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "handle" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "bio" text;
--> statement-breakpoint
ALTER TABLE "creators" ADD COLUMN "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "creators" DROP COLUMN "email";
--> statement-breakpoint
ALTER TABLE "creators" DROP COLUMN "status";
--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "creators_handle_unique" UNIQUE("handle");
--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "creators_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "workspace_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "creator_id";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "title";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "state";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "version";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "updated_at";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "deleted_at";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "previous_state";
--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "has_state_drift";
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "content_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"type" text NOT NULL,
	"content_url" text,
	"text_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" text NOT NULL,
	"definition" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"state" jsonb DEFAULT '{"inputs":{},"outputs":{}}'::jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
