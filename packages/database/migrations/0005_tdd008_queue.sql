CREATE TABLE "queue_dead_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_job_id" text NOT NULL,
	"task_name" text NOT NULL,
	"payload" jsonb NOT NULL,
	"error_name" text NOT NULL,
	"error_message" text NOT NULL,
	"attempts" integer NOT NULL,
	"failed_at" timestamp DEFAULT now() NOT NULL,
	"replayed_at" timestamp,
	CONSTRAINT "queue_dead_letters_attempts_positive" CHECK ("queue_dead_letters"."attempts" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "queue_dead_letters_queue_job_id_idx" ON "queue_dead_letters" USING btree ("queue_job_id");--> statement-breakpoint
CREATE INDEX "queue_dead_letters_task_name_idx" ON "queue_dead_letters" USING btree ("task_name");