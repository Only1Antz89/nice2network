CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "algorithm_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"blueprint_model" text NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding_dimensions" integer DEFAULT 768 NOT NULL,
	"rollout_stage" integer DEFAULT 1 NOT NULL,
	"weights" jsonb NOT NULL,
	"created_by" uuid,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_affinities" (
	"user_id" uuid NOT NULL,
	"dimension_type" text NOT NULL,
	"dimension_key" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_affinities_user_id_dimension_type_dimension_key_pk" PRIMARY KEY("user_id","dimension_type","dimension_key")
);
--> statement-breakpoint
CREATE TABLE "member_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"content_hash" text NOT NULL,
	"dimensions" integer DEFAULT 768 NOT NULL,
	"embedding" vector(768) NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"schema_version" text DEFAULT '1.0' NOT NULL,
	"input_hash" text NOT NULL,
	"outcome" text NOT NULL,
	"assumptions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"covered_contributions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gaps" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"risks" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failure_status" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "project_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"algorithm_version" integer NOT NULL,
	"score" integer NOT NULL,
	"tier" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"component_scores" jsonb NOT NULL,
	"reasons" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"alerted_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recommendation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event" text NOT NULL,
	"signal_weight" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"provider" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"processed" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"error" text,
	"requested_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "role_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"content_hash" text NOT NULL,
	"dimensions" integer DEFAULT 768 NOT NULL,
	"embedding" vector(768) NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_roles" ADD COLUMN "professions" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "project_roles" ADD COLUMN "required_skills" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "project_roles" ADD COLUMN "useful_skills" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "project_roles" ADD COLUMN "phase" text DEFAULT 'now' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_roles" ADD COLUMN "criticality" text DEFAULT 'important' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_roles" ADD COLUMN "work_mode" text;--> statement-breakpoint
ALTER TABLE "project_roles" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "project_roles" ADD COLUMN "blueprint_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "timezone" text DEFAULT 'Europe/London' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "work_mode" text DEFAULT 'remote' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "allow_remote_fallback" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text DEFAULT 'Europe/London' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "work_mode" text DEFAULT 'remote' NOT NULL;--> statement-breakpoint
ALTER TABLE "algorithm_settings" ADD CONSTRAINT "algorithm_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_affinities" ADD CONSTRAINT "member_affinities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_embeddings" ADD CONSTRAINT "member_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_blueprints" ADD CONSTRAINT "project_blueprints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_blueprints" ADD CONSTRAINT "project_blueprints_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_recommendations" ADD CONSTRAINT "project_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_recommendations" ADD CONSTRAINT "project_recommendations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_recommendations" ADD CONSTRAINT "project_recommendations_role_id_project_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."project_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_recommendation_id_project_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."project_recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_jobs" ADD CONSTRAINT "recommendation_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_embeddings" ADD CONSTRAINT "role_embeddings_role_id_project_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."project_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "algorithm_settings_version_unique" ON "algorithm_settings" USING btree ("version");--> statement-breakpoint
CREATE INDEX "algorithm_settings_status_idx" ON "algorithm_settings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "member_affinities_lookup_idx" ON "member_affinities" USING btree ("dimension_type","dimension_key");--> statement-breakpoint
CREATE UNIQUE INDEX "member_embedding_provider_unique" ON "member_embeddings" USING btree ("user_id","provider","model");--> statement-breakpoint
CREATE INDEX "member_embeddings_provider_idx" ON "member_embeddings" USING btree ("provider","status");--> statement-breakpoint
CREATE UNIQUE INDEX "project_blueprint_version_unique" ON "project_blueprints" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "project_blueprints_status_idx" ON "project_blueprints" USING btree ("project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "project_recommendation_unique" ON "project_recommendations" USING btree ("user_id","role_id","algorithm_version");--> statement-breakpoint
CREATE INDEX "project_recommendations_feed_idx" ON "project_recommendations" USING btree ("user_id","status","score");--> statement-breakpoint
CREATE INDEX "project_recommendations_project_idx" ON "project_recommendations" USING btree ("project_id","role_id","score");--> statement-breakpoint
CREATE INDEX "recommendation_events_rec_idx" ON "recommendation_events" USING btree ("recommendation_id","created_at");--> statement-breakpoint
CREATE INDEX "recommendation_events_user_idx" ON "recommendation_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "recommendation_jobs_status_idx" ON "recommendation_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "role_embedding_provider_unique" ON "role_embeddings" USING btree ("role_id","provider","model");--> statement-breakpoint
CREATE INDEX "role_embeddings_provider_idx" ON "role_embeddings" USING btree ("provider","status");
--> statement-breakpoint
CREATE INDEX "member_embeddings_cosine_idx" ON "member_embeddings" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX "role_embeddings_cosine_idx" ON "role_embeddings" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
UPDATE "project_roles" SET "required_skills" = "skills", "professions" = ARRAY["title"], "reason" = coalesce("description", 'This role supports an open project need.');
--> statement-breakpoint
UPDATE "users" SET "city" = nullif(btrim(split_part("location", ',', 1)), ''), "country" = nullif(btrim(split_part("location", ',', 2)), '') WHERE "location" IS NOT NULL;
--> statement-breakpoint
UPDATE "projects" SET "city" = nullif(btrim(split_part("location", ',', 1)), ''), "country" = nullif(btrim(split_part("location", ',', 2)), '') WHERE "location" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "algorithm_settings" ("version", "status", "provider", "blueprint_model", "embedding_model", "embedding_dimensions", "rollout_stage", "weights", "activated_at")
VALUES (1, 'active', 'openai', 'gpt-4.1-mini', 'text-embedding-3-small', 768, 1, '{"requiredSkills":35,"profession":20,"career":10,"compatibility":15,"availability":8,"relevance":5,"learned":5,"warmPath":2,"feedRoleMatch":55,"feedUrgency":12,"feedRelevance":8,"feedEyes":10,"feedFreshness":5,"feedNetwork":5,"feedExploration":5}'::jsonb, now())
ON CONFLICT ("version") DO NOTHING;
