CREATE TABLE "project_leadership_elections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"former_owner_id" uuid NOT NULL,
	"electorate" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"selected_user_id" uuid,
	"selection_method" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_leadership_votes" (
	"election_id" uuid NOT NULL,
	"voter_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_leadership_votes_election_id_voter_id_pk" PRIMARY KEY("election_id","voter_id")
);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recovery_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_leadership_elections" ADD CONSTRAINT "project_leadership_elections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_leadership_elections" ADD CONSTRAINT "project_leadership_elections_former_owner_id_users_id_fk" FOREIGN KEY ("former_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_leadership_elections" ADD CONSTRAINT "project_leadership_elections_selected_user_id_users_id_fk" FOREIGN KEY ("selected_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_leadership_votes" ADD CONSTRAINT "project_leadership_votes_election_id_project_leadership_elections_id_fk" FOREIGN KEY ("election_id") REFERENCES "public"."project_leadership_elections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_leadership_votes" ADD CONSTRAINT "project_leadership_votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_leadership_votes" ADD CONSTRAINT "project_leadership_votes_candidate_id_users_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_leadership_open_unique" ON "project_leadership_elections" USING btree ("project_id") WHERE "project_leadership_elections"."status" = 'open';--> statement-breakpoint
CREATE INDEX "project_leadership_deadline_idx" ON "project_leadership_elections" USING btree ("status","deadline");--> statement-breakpoint
CREATE INDEX "project_leadership_votes_candidate_idx" ON "project_leadership_votes" USING btree ("election_id","candidate_id");