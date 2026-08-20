import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin suspensions use fixed reversible durations and exact expiry reconciliation", async () => {
  const [schema, lifecycle, action, auth] = await Promise.all([
    read("db/schema.ts"),
    read("lib/admin-account-lifecycle.ts"),
    read("app/api/admin/members/[userId]/action/route.ts"),
    read("auth.ts"),
  ]);
  assert.match(schema, /suspendedUntil: timestamp\("suspended_until"/);
  for (const duration of ["24h", "3d", "5d", "7d", "30d"]) assert.match(lifecycle, new RegExp(`"${duration}"`));
  assert.match(action, /suspensionDuration: z\.enum/);
  assert.match(action, /suspendedUntil: input\.action === "suspend"/);
  assert.match(auth, /reconcileExpiredSuspension/);
});

test("admin deletion is a seven-day restorable hold restricted to Master and Super Admin", async () => {
  const [schema, roles, lifecycle, deletionRoute, restoreRoute, members, console] = await Promise.all([
    read("db/schema.ts"),
    read("lib/admin-roles.ts"),
    read("lib/admin-account-lifecycle.ts"),
    read("app/api/admin/members/[userId]/deletion/route.ts"),
    read("app/api/admin/members/[userId]/deletion/restore/route.ts"),
    read("app/api/admin/members/route.ts"),
    read("app/admin/admin-console.tsx"),
  ]);
  assert.match(schema, /accountDeletionHolds = pgTable\("account_deletion_holds"/);
  assert.match(lifecycle, /ADMIN_DELETION_RETENTION_MS = 7 \* 24 \* 60 \* 60_000/);
  assert.match(lifecycle, /previousStatus: member\.status/);
  assert.match(lifecycle, /status: "pending_admin_deletion"/);
  assert.match(deletionRoute, /requirePermission\("members\.delete"\)/);
  assert.match(restoreRoute, /restoreAdminAccountDeletion/);
  assert.match(roles, /master_admin: \[[^\]]*"members\.delete"/);
  assert.match(roles, /super_admin: \[[^\]]*"members\.delete"/);
  assert.doesNotMatch(roles, /safety_admin: \[[^\]]*"members\.delete"/);
  assert.match(members, /orderBy\(view === "deleted" \? asc\(accountDeletionHolds\.scheduledAt\)/);
  assert.match(console, /Seven-day restoration window/);
  assert.match(console, /DeletionCountdown/);
});

test("permanent admin deletion hands over projects without using project deletion fields", async () => {
  const lifecycle = await read("lib/admin-account-lifecycle.ts");
  assert.match(lifecycle, /selectSuccessor/);
  assert.match(lifecycle, /single_co_owner/);
  assert.match(lifecycle, /candidateFit/);
  assert.match(lifecycle, /status !== "pending_deletion"/);
  assert.doesNotMatch(lifecycle, /deletionScheduledAt|deletionRequestedAt|deletionPreviousStatus/);
  assert.match(lifecycle, /finaliseAccountDeletion\(member\.id, member\.email, "pending_admin_deletion"\)/);
});
