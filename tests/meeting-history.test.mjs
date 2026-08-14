import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const calendarRoute = new URL("../app/api/calendar/events/route.ts", import.meta.url);
const pagePath = new URL("../app/page.tsx", import.meta.url);

test("the calendar API returns upcoming and recent past visible meets", async () => {
  const route = await readFile(calendarRoute, "utf8");

  assert.match(route, /const upcomingRows = await db\.select/);
  assert.match(route, /gte\(meetings\.endsAt, now\)/);
  assert.match(route, /const pastRows = await db\.select/);
  assert.match(route, /lt\(meetings\.endsAt, now\)/);
  assert.match(route, /orderBy\(desc\(meetings\.endsAt\)\)/);
});

test("the Meet page keeps completed meets accessible in history", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.match(page, /<h3>Past meets<\/h3>/);
  assert.match(page, /pastMeets\.slice/);
  assert.match(page, /setDetail\(meet\).*Details/);
  assert.match(page, /showAllPastMeets/);
});
