CREATE TABLE "content_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text,
	"preview" text,
	"step" integer DEFAULT 0 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_drafts_owner_kind_idx" ON "content_drafts" USING btree ("owner_id","kind","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_drafts_project_unique" ON "content_drafts" USING btree ("project_id");--> statement-breakpoint
INSERT INTO "content_drafts" ("owner_id", "kind", "title", "preview", "step", "payload", "project_id", "created_at", "updated_at")
SELECT p."owner_id", 'project', p."title", left(p."summary", 180), 1,
  jsonb_build_object(
    'form', jsonb_build_object('title', p."title", 'summary', p."summary", 'description', coalesce(p."description", ''), 'imageUrl', p."image_url", 'industry', p."industry", 'stage', p."stage", 'workMode', p."work_mode", 'city', coalesce(p."city", ''), 'country', coalesce(p."country", ''), 'timezone', p."timezone", 'allowRemoteFallback', p."allow_remote_fallback"),
    'locationQuery', coalesce(p."location", ''), 'step', 1, 'projectId', p."id",
    'blueprintId', (select pb."id" from "project_blueprints" pb where pb."project_id" = p."id" order by pb."version" desc limit 1),
    'roadmap', '[]'::jsonb, 'roles', '[]'::jsonb, 'selectedCoOwners', '[]'::jsonb, 'similarProjects', '[]'::jsonb
  ), p."id", p."created_at", p."updated_at"
FROM "projects" p WHERE p."status" = 'draft'
ON CONFLICT ("project_id") DO NOTHING;
