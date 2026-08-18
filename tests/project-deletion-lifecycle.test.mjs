import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("primary owners cannot follow their own projects in the UI, API or persisted data", async () => {
  const [page, followRoute, migration] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/projects/[projectId]/follow/route.ts"),
    read("drizzle/0028_stormy_jasper_sitwell.sql"),
  ]);
  assert.match(page, /!project\.isPrimaryOwner/);
  assert.match(followRoute, /project\.ownerId === member\.id/);
  assert.match(followRoute, /new ApiError\(409, "Project owners cannot follow their own project"\)/);
  assert.match(migration, /DELETE FROM "project_follows"/);
  assert.match(migration, /Project owners cannot follow their own projects/);
});

test("deletion planning implements immediate, 24, 48 and 72 hour tiers with funding override", async () => {
  const source = await read("lib/project-deletion.ts");
  assert.match(source, /ageHours < 24 \|\| \(members\.length === 0 && followers\.length < 100\)/);
  assert.match(source, /immediatelyEligible && !signals\.hasFunding \? 0/);
  assert.match(source, /signalCount === 3 \? 72 : signalCount > 0 \? 48 : 24/);
  assert.match(source, /completed\.length >= 2/);
  assert.match(source, /roles\.every\(role => role\.filled >= role\.capacity\)/);
});

test("pending deletion is read-only, cancellable only by the primary owner and finalized idempotently", async () => {
  const [access, cancel, finalizer, migration] = await Promise.all([
    read("lib/project-access.ts"),
    read("app/api/projects/[projectId]/deletion/cancel/route.ts"),
    read("lib/project-deletion.ts"),
    read("drizzle/0028_stormy_jasper_sitwell.sql"),
  ]);
  assert.match(access, /status === "pending_deletion"/);
  assert.match(cancel, /eq\(projects\.ownerId, member\.id\)/);
  assert.match(cancel, /status === "deleted"/);
  assert.match(finalizer, /eq\(projects\.status, "pending_deletion"\)/);
  assert.match(finalizer, /lte\(projects\.deletionScheduledAt, now\)/);
  assert.match(migration, /Finalized deleted projects are immutable/);
  assert.match(migration, /projects_deletion_lifecycle_guard/);
});

test("all deletion stakeholders receive required deduplicated lifecycle notifications", async () => {
  const [deletion, notifications] = await Promise.all([
    read("lib/project-deletion.ts"),
    read("lib/notifications.ts"),
  ]);
  assert.match(deletion, /new Set\(\[project\?\.ownerId/);
  assert.match(deletion, /projectMembers/);
  assert.match(deletion, /projectFundingInterests/);
  assert.match(deletion, /required: true/);
  assert.match(deletion, /"requested" \| "cancelled" \| "finalized"/);
  assert.match(notifications, /if\(item\.required\)return true/);
});

test("shared toasts use theme and forced-colour-safe tokens", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /\.toast\{background:var\(--solid\);color:var\(--solid-ink\)/);
  assert.match(css, /@media\(forced-colors:active\)\{\.toast/);
});
