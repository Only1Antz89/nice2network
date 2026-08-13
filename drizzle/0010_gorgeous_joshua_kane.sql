CREATE TABLE "saved_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"bookmarked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_items_user_entity_unique" ON "saved_items" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "saved_items_user_idx" ON "saved_items" USING btree ("user_id","updated_at");--> statement-breakpoint
INSERT INTO "saved_items" ("user_id","entity_type","entity_id","pinned","bookmarked","updated_at")
SELECT "user_id", 'project', "project_id", "pinned", "starred", "updated_at"
FROM "project_bookmarks"
WHERE "pinned" = true OR "starred" = true
ON CONFLICT ("user_id","entity_type","entity_id") DO UPDATE SET
  "pinned" = excluded."pinned",
  "bookmarked" = excluded."bookmarked",
  "updated_at" = excluded."updated_at";
