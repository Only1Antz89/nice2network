CREATE TABLE "career_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"start_date" date,
	"end_date" date,
	"current" boolean DEFAULT false NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"institution" text NOT NULL,
	"qualification" text NOT NULL,
	"field_of_study" text,
	"start_year" integer,
	"end_year" integer,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_bookmarks" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_bookmarks_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_skill" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "secondary_skill" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tertiary_skill" text;--> statement-breakpoint
UPDATE "users" SET
	"primary_skill" = COALESCE("primary_skill", "skills"[1]),
	"secondary_skill" = COALESCE("secondary_skill", "skills"[2]),
	"tertiary_skill" = COALESCE("tertiary_skill", "skills"[3]);--> statement-breakpoint
ALTER TABLE "career_history" ADD CONSTRAINT "career_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_history" ADD CONSTRAINT "education_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "career_history_user_idx" ON "career_history" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "education_history_user_idx" ON "education_history" USING btree ("user_id","sort_order");--> statement-breakpoint
CREATE INDEX "project_bookmarks_user_idx" ON "project_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_comments_project_time_idx" ON "project_comments" USING btree ("project_id","created_at");
