CREATE TABLE "meeting_participants" (
	"meeting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "meeting_participants_meeting_id_user_id_pk" PRIMARY KEY("meeting_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "mode" text DEFAULT 'video' NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "max_participants" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "reminder_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_participants_user_idx" ON "meeting_participants" USING btree ("user_id","invited_at");
--> statement-breakpoint
UPDATE "meetings"
SET "mode" = 'in_person', "max_participants" = 100
WHERE "provider" = 'in_person';
--> statement-breakpoint
INSERT INTO "meeting_participants" ("meeting_id", "user_id", "status", "invited_at")
SELECT "meetings"."id", "users"."id", 'invited', "meetings"."created_at"
FROM "meetings"
CROSS JOIN LATERAL jsonb_array_elements(
	CASE WHEN jsonb_typeof("meetings"."attendees") = 'array' THEN "meetings"."attendees" ELSE '[]'::jsonb END
) AS "attendee"
INNER JOIN "users" ON lower("users"."email") = lower("attendee"->>'email')
ON CONFLICT DO NOTHING;
