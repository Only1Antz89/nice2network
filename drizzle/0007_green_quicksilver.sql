CREATE TABLE "timeline_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"linked_project_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"attachment_type" text,
	"attachment_url" text,
	"video_url" text,
	"visibility" text DEFAULT 'network' NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "timeline_posts" ADD CONSTRAINT "timeline_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "timeline_posts_time_idx" ON "timeline_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "timeline_posts_author_idx" ON "timeline_posts" USING btree ("author_id","created_at");