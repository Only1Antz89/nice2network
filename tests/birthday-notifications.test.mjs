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

test("birthday celebrations are private notifications rather than feed posts", async () => {
  const [schema, migration, service, notificationsApi, messageApi, card, privacyApi, registration, schedule] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0038_lumpy_medusa.sql"),
    read("lib/birthday-notifications.ts"),
    read("app/api/notifications/route.ts"),
    read("app/api/birthday-events/[eventId]/message/route.ts"),
    read("components/birthday-notification-card.tsx"),
    read("app/api/privacy/route.ts"),
    read("app/api/auth/register/route.ts"),
    read("vercel.json"),
  ]);
  assert.match(schema, /export const birthdayEvents = pgTable\("birthday_events"/);
  assert.match(schema, /birthdayCelebrationsEnabled: boolean\("birthday_celebrations_enabled"\).*default\(true\)/);
  assert.match(migration, /age_band" = 'teen_16_17'/);
  assert.match(service, /inner join follows outbound/);
  assert.match(service, /inner join follows inbound/);
  assert.match(service, /coalesce\(np\.followed_updates, true\)/);
  assert.match(service, /not exists \(\s*select 1 from blocks/);
  assert.doesNotMatch(service, /timelinePosts|timeline_posts/);
  assert.match(notificationsApi, /visibleToMember/);
  assert.match(messageApi, /This birthday celebration is only available to current connections/);
  assert.match(card, /Birthday Project cake/);
  assert.match(card, /`Wish \$\{firstName\} happy birthday`/);
  assert.match(privacyApi, /birthdayCelebrationsEnabled/);
  assert.match(registration, /birthdayCelebrationsEnabled: false/);
  assert.match(schedule, /"\/api\/cron\/birthdays", "schedule": "0 11 \* \* \*"/);
});
