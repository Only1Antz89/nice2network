CREATE TABLE "project_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"content_hash" text NOT NULL,
	"dimensions" integer DEFAULT 768 NOT NULL,
	"embedding" vector(768) NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "algorithm_settings" ADD COLUMN "similar_project_suggestions_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "project_embeddings" ADD CONSTRAINT "project_embeddings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_embedding_provider_unique" ON "project_embeddings" USING btree ("project_id","provider","model");--> statement-breakpoint
CREATE INDEX "project_embeddings_provider_idx" ON "project_embeddings" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "project_embeddings_cosine_idx" ON "project_embeddings" USING hnsw ("embedding" vector_cosine_ops);
