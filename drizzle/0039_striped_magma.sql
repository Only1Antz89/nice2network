ALTER TABLE "birthday_events" ADD COLUMN "post_id" uuid;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "birthday_feed_posts_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "timeline_posts" ADD COLUMN "kind" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "birthday_events" ADD CONSTRAINT "birthday_events_post_id_timeline_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."timeline_posts"("id") ON DELETE set null ON UPDATE no action;