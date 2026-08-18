import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const calendarRoute = new URL("../app/api/calendar/events/route.ts", import.meta.url);
const pagePath = new URL("../app/page.tsx", import.meta.url);
const meetingRoute = new URL("../app/api/meetings/[meetingId]/route.ts", import.meta.url);

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
  assert.match(page, /\[pastMeetsCollapsed, setPastMeetsCollapsed\] = useState\(true\)/);
  assert.match(page, /aria-controls="past-meets-list"/);
  assert.match(page, /MeetCardActions/);
});

test("meet card actions can pin, bookmark and safely delete hosted meets", async () => {
  const [page, route] = await Promise.all([
    readFile(pagePath, "utf8"),
    readFile(meetingRoute, "utf8"),
  ]);

  assert.match(page, /onSave\(meet, "pin"\)/);
  assert.match(page, /onSave\(meet, "bookmark"\)/);
  assert.match(page, /onEdit\(meet\)/);
  assert.match(page, /<Pencil size=\{14\}/);
  assert.match(page, /meet\.canManage &&/);
  assert.match(page, /meet\.canDelete &&/);
  assert.match(page, /method: "DELETE"/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /existing\.createdBy !== member\.id/);
  assert.match(route, /"meeting\.deleted"/);
});
