import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("account deactivation follows project leadership and meet cancellation rules", async () => {
  const [lifecycle, schema, electionRoute, reminders] = await Promise.all([
    read("lib/account-lifecycle.ts"),
    read("db/schema.ts"),
    read("app/api/projects/leadership-elections/route.ts"),
    read("lib/meet-reminders.ts"),
  ]);
  assert.match(lifecycle, /LEADERSHIP_DECISION_MS = 24 \* 60 \* 60_000/);
  assert.match(lifecycle, /selectionMethod: "single_co_owner"/);
  assert.match(lifecycle, /electorate = coOwners\.length > 1 \? "co_owners"/);
  assert.match(lifecycle, /scoreMatch/);
  assert.match(lifecycle, /membershipRole: "former_owner"/);
  assert.match(lifecycle, /cancellationReason: "Host account is no longer active"/);
  assert.match(schema, /projectLeadershipElections/);
  assert.match(schema, /projectLeadershipVotes/);
  assert.match(electionRoute, /project\.leadership_vote_cast/);
  assert.match(reminders, /isNull\(meetings\.cancelledAt\)/);
});

test("deactivated identities remain labelled on posts, messages, and profiles", async () => {
  const [page, posts, messages, profiles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/posts/route.ts"),
    read("app/api/conversations/[conversationId]/messages/route.ts"),
    read("app/api/profiles/[userId]/route.ts"),
  ]);
  assert.match(posts, /authorStatus: users\.status/);
  assert.match(messages, /senderStatus:users\.status/);
  assert.match(profiles, /deactivated: true/);
  assert.match(page, /Account no longer active/);
  assert.match(page, /Review what happens next/);
});
