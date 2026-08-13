ALTER TABLE "milestones" ADD COLUMN "phase" text DEFAULT 'now' NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "completion_summary" text;--> statement-breakpoint
ALTER TABLE "project_updates" ADD COLUMN "milestone_id" uuid;--> statement-breakpoint
ALTER TABLE "project_updates" ADD COLUMN "attachment_type" text;--> statement-breakpoint
ALTER TABLE "project_updates" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "project_updates" ADD COLUMN "attachment_name" text;--> statement-breakpoint
ALTER TABLE "project_updates" ADD COLUMN "status" text DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_updates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "project_updates" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;