CREATE TABLE "introduction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"connector_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"context" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"conversation_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "network_map_hides" (
	"viewer_id" uuid NOT NULL,
	"hidden_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "network_map_hides_viewer_id_hidden_user_id_pk" PRIMARY KEY("viewer_id","hidden_user_id")
);
--> statement-breakpoint
ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_connector_id_users_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "introduction_requests" ADD CONSTRAINT "introduction_requests_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_map_hides" ADD CONSTRAINT "network_map_hides_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_map_hides" ADD CONSTRAINT "network_map_hides_hidden_user_id_users_id_fk" FOREIGN KEY ("hidden_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "introduction_connector_status_idx" ON "introduction_requests" USING btree ("connector_id","status","created_at");--> statement-breakpoint
CREATE INDEX "introduction_requester_time_idx" ON "introduction_requests" USING btree ("requester_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "introduction_pending_unique" ON "introduction_requests" USING btree ("requester_id","connector_id","target_id") WHERE "introduction_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "network_map_hides_hidden_idx" ON "network_map_hides" USING btree ("hidden_user_id");