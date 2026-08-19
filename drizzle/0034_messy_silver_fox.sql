ALTER TABLE "projects" ALTER COLUMN "allow_remote_fallback" SET DEFAULT false;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "prevent_read_only_project_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_project_id uuid;
  target_status text;
  target_owner_id uuid;
  target_user_id uuid;
BEGIN
  target_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
  SELECT status, owner_id INTO target_status, target_owner_id FROM projects WHERE id = target_project_id;

  IF TG_TABLE_NAME = 'project_follows' AND TG_OP <> 'DELETE' THEN
    target_user_id := NULLIF(to_jsonb(NEW)->>'user_id', '')::uuid;
    IF target_user_id = target_owner_id THEN
      RAISE EXCEPTION 'Project owners cannot follow their own projects' USING ERRCODE = '23514';
    END IF;
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
