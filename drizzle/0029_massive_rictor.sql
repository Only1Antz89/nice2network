ALTER TABLE "invitations" ADD COLUMN "membership_role" text DEFAULT 'contributor' NOT NULL;--> statement-breakpoint
CREATE INDEX "invitations_project_role_status_idx" ON "invitations" USING btree ("project_id","membership_role","status","expires_at");--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_project_co_owner_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  primary_owner uuid;
  active_count integer;
  reserved_count integer;
BEGIN
  IF TG_TABLE_NAME = 'project_members' THEN
    IF NEW.membership_role <> 'co_owner' THEN
      RETURN NEW;
    END IF;
  ELSE
    IF NOT (NEW.membership_role = 'co_owner' AND NEW.status = 'pending' AND NEW.expires_at > now()) THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT owner_id INTO primary_owner FROM projects WHERE id = NEW.project_id FOR UPDATE;
  IF primary_owner IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF TG_TABLE_NAME = 'project_members' THEN
    IF NEW.user_id = primary_owner THEN
      RAISE EXCEPTION 'The primary owner cannot also be a co-owner';
    END IF;
    SELECT count(*) INTO active_count
    FROM project_members
    WHERE project_id = NEW.project_id
      AND membership_role = 'co_owner'
      AND user_id <> NEW.user_id;
    SELECT count(*) INTO reserved_count
    FROM invitations
    WHERE project_id = NEW.project_id
      AND membership_role = 'co_owner'
      AND status = 'pending'
      AND expires_at > now();
  ELSE
    IF NEW.invitee_id = primary_owner THEN
      RAISE EXCEPTION 'The primary owner cannot be invited as a co-owner';
    END IF;
    SELECT count(*) INTO active_count
    FROM project_members
    WHERE project_id = NEW.project_id
      AND membership_role = 'co_owner';
    SELECT count(*) INTO reserved_count
    FROM invitations
    WHERE project_id = NEW.project_id
      AND membership_role = 'co_owner'
      AND status = 'pending'
      AND expires_at > now()
      AND id <> NEW.id;
  END IF;

  IF active_count + reserved_count >= 2 THEN
    RAISE EXCEPTION 'A project may have no more than two active or invited co-owners';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER project_members_co_owner_limit
BEFORE INSERT OR UPDATE OF project_id, user_id, membership_role ON project_members
FOR EACH ROW EXECUTE FUNCTION enforce_project_co_owner_limit();--> statement-breakpoint

CREATE TRIGGER invitations_co_owner_limit
BEFORE INSERT OR UPDATE OF project_id, invitee_id, membership_role, status, expires_at ON invitations
FOR EACH ROW EXECUTE FUNCTION enforce_project_co_owner_limit();
