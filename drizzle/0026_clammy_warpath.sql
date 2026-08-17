ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
WITH username_candidates AS (
  SELECT
    "id",
    "email",
    CASE
      WHEN base IN ('about','admin','api','change-password','community','forgot-password','meet','onboarding','privacy','reset-password','share','signin','terms') THEN base || '-n2'
      ELSE base
    END AS base
  FROM (
    SELECT
      "id",
      "email",
      CASE
        WHEN length(regexp_replace(split_part(lower("email"), '@', 1), '[^a-z0-9_-]+', '', 'g')) >= 3
          THEN left(regexp_replace(split_part(lower("email"), '@', 1), '[^a-z0-9_-]+', '', 'g'), 24)
        ELSE 'member-' || left(replace("id"::text, '-', ''), 8)
      END AS base
    FROM "users"
  ) normalized
), ranked_usernames AS (
  SELECT
    "id",
    base,
    row_number() OVER (
      PARTITION BY base
      ORDER BY CASE WHEN lower("email") = 'anthony@intaillium.com' THEN 0 ELSE 1 END, "id"
    ) AS collision_number
  FROM username_candidates
)
UPDATE "users" AS member
SET "username" = CASE
  WHEN ranked.collision_number = 1 THEN ranked.base
  ELSE left(ranked.base, 22) || '-' || left(replace(member."id"::text, '-', ''), 6)
END
FROM ranked_usernames AS ranked
WHERE member."id" = ranked."id";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");--> statement-breakpoint
UPDATE "privacy_settings"
SET "profile_visibility" = 'public', "updated_at" = now()
WHERE "user_id" = (SELECT "id" FROM "users" WHERE lower("email") = 'anthony@intaillium.com' LIMIT 1);
