import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { birthdayMatches, getUkDateParts } from "../lib/birthday-dates.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("birthday date matching uses UK dates and celebrates leap-day birthdays on 28 February", () => {
  assert.deepEqual(getUkDateParts(new Date("2026-08-21T11:00:00Z")), { year: 2026, month: 8, day: 21 });
  const leapBirthday = new Date("2000-02-29T00:00:00Z");
  assert.equal(birthdayMatches(leapBirthday, 2026, 2, 28), true);
  assert.equal(birthdayMatches(leapBirthday, 2028, 2, 28), false);
  assert.equal(birthdayMatches(leapBirthday, 2028, 2, 29), true);
});

test("birthday notifications default on while authored feed celebrations require opt-in", async () => {
  const [schema, notificationMigration, postMigration, service, postsApi, contentAccess, notificationsApi, messageApi, card, privacyApi, registration, settingsPage, schedule] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0038_lumpy_medusa.sql"),
    read("drizzle/0039_striped_magma.sql"),
    read("lib/birthday-notifications.ts"),
    read("app/api/posts/route.ts"),
    read("lib/content-access.ts"),
    read("app/api/notifications/route.ts"),
    read("app/api/birthday-events/[eventId]/message/route.ts"),
    read("components/birthday-notification-card.tsx"),
    read("app/api/privacy/route.ts"),
    read("app/api/auth/register/route.ts"),
    read("app/page.tsx"),
    read("vercel.json"),
  ]);
  assert.match(schema, /export const birthdayEvents = pgTable\("birthday_events"/);
  assert.match(schema, /birthdayCelebrationsEnabled: boolean\("birthday_celebrations_enabled"\).*default\(true\)/);
  assert.match(schema, /birthdayFeedPostsEnabled: boolean\("birthday_feed_posts_enabled"\).*default\(false\)/);
  assert.match(notificationMigration, /age_band" = 'teen_16_17'/);
  assert.match(postMigration, /birthday_feed_posts_enabled" boolean DEFAULT false NOT NULL/);
  assert.match(postMigration, /timeline_posts" ADD COLUMN "kind" text DEFAULT 'standard' NOT NULL/);
  assert.match(service, /inner join follows outbound/);
  assert.match(service, /inner join follows inbound/);
  assert.match(service, /coalesce\(np\.followed_updates, true\)/);
  assert.match(service, /not exists \(\s*select 1 from blocks/);
  assert.match(service, /if \(member\.birthdayFeedPostsEnabled\)/);
  assert.match(service, /kind: "birthday"/);
  assert.match(service, /authorId: member\.id/);
  assert.match(service, /visibility: "connections"/);
  assert.match(service, /BIRTHDAY_ARTWORK_URL/);
  assert.match(postsApi, /scope === "newest"\s*\? and\(eq\(timelinePosts\.kind, "standard"\)/);
  assert.match(postsApi, /birthday_follow\.follower_id/);
  assert.match(contentAccess, /post\.kind === "birthday"/);
  assert.match(contentAccess, /eq\(follows\.followerId, userId\)/);
  assert.match(notificationsApi, /visibleToMember/);
  assert.match(messageApi, /This birthday celebration is only available to current connections/);
  assert.match(card, /Birthday Project cake/);
  assert.match(card, /`Wish \$\{firstName\} happy birthday`/);
  assert.match(privacyApi, /birthdayCelebrationsEnabled/);
  assert.match(privacyApi, /birthdayFeedPostsEnabled/);
  assert.match(settingsPage, /Birthday feed post/);
  assert.match(settingsPage, /This is off until you opt in/);
  assert.match(registration, /birthdayCelebrationsEnabled: false/);
  assert.match(schedule, /"\/api\/cron\/birthdays", "schedule": "0 11 \* \* \*"/);
});
