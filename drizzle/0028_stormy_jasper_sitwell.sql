ALTER TABLE "projects" ADD COLUMN "deletion_previous_status" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deletion_scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deletion_requested_by" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_deletion_requested_by_users_id_fk" FOREIGN KEY ("deletion_requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_deletion_schedule_idx" ON "projects" USING btree ("status","deletion_scheduled_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "protect_project_deletion_lifecycle"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status IN ('pending_deletion', 'deleted') THEN
    RAISE EXCEPTION 'Pending and finalized projects must be retained for audit' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'deleted' THEN
    RAISE EXCEPTION 'Finalized deleted projects are immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending_deletion' THEN
    IF NEW.status = 'deleted' THEN
      RETURN NEW;
    END IF;
    IF NEW.status = OLD.deletion_previous_status
      AND NEW.deletion_requested_at IS NULL
      AND NEW.deletion_scheduled_at IS NULL
      AND NEW.deletion_requested_by IS NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Pending deletion projects are read-only' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "projects_deletion_lifecycle_guard" BEFORE UPDATE OR DELETE ON "projects" FOR EACH ROW EXECUTE FUNCTION "protect_project_deletion_lifecycle"();
--> statement-breakpoint
DELETE FROM "project_follows"
USING "projects"
WHERE "project_follows"."project_id" = "projects"."id"
  AND "project_follows"."user_id" = "projects"."owner_id";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_read_only_project_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_project_id uuid;
  target_status text;
  target_owner_id uuid;
BEGIN
  target_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
  SELECT status, owner_id INTO target_status, target_owner_id FROM projects WHERE id = target_project_id;
  IF TG_TABLE_NAME = 'project_follows' AND TG_OP <> 'DELETE' AND NEW.user_id = target_owner_id THEN
    RAISE EXCEPTION 'Project owners cannot follow their own projects' USING ERRCODE = '23514';
  END IF;
  IF target_status = 'deleted' THEN
    RAISE EXCEPTION 'Finalized deleted projects are immutable' USING ERRCODE = '55000';
  END IF;
  IF target_status = 'pending_deletion' THEN
    RAISE EXCEPTION 'This project is pending deletion and is read-only' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "project_roles_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_roles" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "milestones_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "milestones" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "project_updates_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_updates" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "applications_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "applications" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "invitations_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "invitations" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "project_follows_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_follows" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "project_funding_interests_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_funding_interests" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "project_involvement_requests_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_involvement_requests" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "project_members_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_members" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "project_eyes_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_eyes" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "project_comments_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_comments" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
--> statement-breakpoint
CREATE TRIGGER "project_bookmarks_read_only_guard" BEFORE INSERT OR UPDATE OR DELETE ON "project_bookmarks" FOR EACH ROW EXECUTE FUNCTION "prevent_read_only_project_mutation"();
