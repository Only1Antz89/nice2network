CREATE TABLE "account_deletion_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"previous_status" text NOT NULL,
	"policy_code" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"restored_by" uuid,
	"restored_at" timestamp with time zone,
	"finalized_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid,
	"email" text NOT NULL,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"details" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users" SET "deletion_requested_at" = coalesce("deactivated_at", "updated_at") WHERE "status" = 'deactivated' AND "recovery_deadline" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "account_deletion_holds" ADD CONSTRAINT "account_deletion_holds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_deletion_holds" ADD CONSTRAINT "account_deletion_holds_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_deletion_holds" ADD CONSTRAINT "account_deletion_holds_restored_by_users_id_fk" FOREIGN KEY ("restored_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_deletion_pending_user_unique" ON "account_deletion_holds" USING btree ("user_id") WHERE "account_deletion_holds"."status" in ('pending', 'finalizing');--> statement-breakpoint
CREATE INDEX "account_deletion_schedule_idx" ON "account_deletion_holds" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "support_requests_status_idx" ON "support_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "support_requests_requester_idx" ON "support_requests" USING btree ("requester_id","created_at");
