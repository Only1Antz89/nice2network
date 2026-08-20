CREATE TABLE "platform_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"profile_taxonomy_safeguards_enabled" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "platform_settings" ("id", "profile_taxonomy_safeguards_enabled") VALUES ('global', true) ON CONFLICT ("id") DO NOTHING;
