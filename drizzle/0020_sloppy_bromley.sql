CREATE TABLE "accessibility_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"colour_theme" text DEFAULT 'system' NOT NULL,
	"text_size" text DEFAULT 'default' NOT NULL,
	"contrast" text DEFAULT 'standard' NOT NULL,
	"readable_font" boolean DEFAULT false NOT NULL,
	"underline_links" boolean DEFAULT false NOT NULL,
	"motion" text DEFAULT 'system' NOT NULL,
	"enhanced_focus" boolean DEFAULT true NOT NULL,
	"large_pointer" boolean DEFAULT false NOT NULL,
	"captions" boolean DEFAULT false NOT NULL,
	"prevent_autoplay" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accessibility_settings" ADD CONSTRAINT "accessibility_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;