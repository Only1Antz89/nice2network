CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "member_recommendation_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"signal" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"suggested_user_id" uuid NOT NULL,
	"algorithm_version" integer DEFAULT 1 NOT NULL,
	"score" integer NOT NULL,
	"component_scores" jsonb NOT NULL,
	"reasons" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"impression_count" integer DEFAULT 0 NOT NULL,
	"last_impressed_at" timestamp with time zone,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "show_followers" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "show_following" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "mute_follow_notifications" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_recommendation_feedback" ADD CONSTRAINT "member_recommendation_feedback_recommendation_id_member_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."member_recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_recommendation_feedback" ADD CONSTRAINT "member_recommendation_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_recommendations" ADD CONSTRAINT "member_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_recommendations" ADD CONSTRAINT "member_recommendations_suggested_user_id_users_id_fk" FOREIGN KEY ("suggested_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id","created_at");--> statement-breakpoint
CREATE INDEX "member_recommendation_feedback_idx" ON "member_recommendation_feedback" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "member_recommendation_unique" ON "member_recommendations" USING btree ("user_id","suggested_user_id","algorithm_version");--> statement-breakpoint
CREATE INDEX "member_recommendations_feed_idx" ON "member_recommendations" USING btree ("user_id","status","score");