CREATE TABLE "birthday_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"celebration_year" integer NOT NULL,
	"celebration_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD COLUMN "birthday_celebrations_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "privacy_settings" SET "birthday_celebrations_enabled" = false FROM "users" WHERE "privacy_settings"."user_id" = "users"."id" AND "users"."age_band" = 'teen_16_17';--> statement-breakpoint
ALTER TABLE "birthday_events" ADD CONSTRAINT "birthday_events_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "birthday_events_subject_year_unique" ON "birthday_events" USING btree ("subject_user_id","celebration_year");--> statement-breakpoint
CREATE INDEX "birthday_events_date_idx" ON "birthday_events" USING btree ("celebration_date");
