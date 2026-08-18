CREATE TABLE "project_funding_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" integer,
	"message" text,
	"status" text DEFAULT 'registered' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "funding_goal" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "share_limit" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "open_to_investment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "open_to_contributions" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "project_funding_interests" ADD CONSTRAINT "project_funding_interests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_funding_interests" ADD CONSTRAINT "project_funding_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_funding_interest_project_idx" ON "project_funding_interests" USING btree ("project_id","created_at");