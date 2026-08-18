import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("project creation offers two invitation-only co-owner slots", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /OWNERSHIP/);
  assert.match(page, /Primary owner · fixed/);
  assert.match(page, /\{\[0, 1\]\.map/);
  assert.match(page, /Search mutual connections/);
  assert.match(page, /Name, @username or profession/);
  assert.match(page, /seven-day invitations/);
  assert.match(page, /coOwnerIds: selectedCoOwners\.map/);
});

test("creation and blueprint APIs validate co-owner IDs before publishing", async () => {
  const [directCreation, approval, service, helper] = await Promise.all([
    read("app/api/projects/route.ts"),
    read("app/api/projects/[projectId]/blueprint/[blueprintId]/approve/route.ts"),
    read("lib/recommendations/service.ts"),
    read("lib/project-co-owners.ts"),
  ]);

  assert.match(directCreation, /coOwnerIds: coOwnerIdsSchema/);
  assert.match(directCreation, /createCoOwnerInvitations\(tx/);
  assert.match(approval, /coOwnerIds: coOwnerIdsSchema/);
  assert.match(service, /createCoOwnerInvitations\(tx/);
  assert.match(helper, /MAX_CO_OWNERS = 2/);
  assert.match(helper, /Choose each co-owner only once/);
  assert.match(helper, /no longer a mutual connection/);
  assert.match(helper, /already a member of this project/);
  assert.match(helper, /Only the primary owner can appoint co-owners/);
});

test("pending invitations reserve capacity and acceptance grants leadership co-ownership", async () => {
  const [helper, responseRoute, projectRoute, migration] = await Promise.all([
    read("lib/project-co-owners.ts"),
    read("app/api/invitations/[token]/respond/route.ts"),
    read("app/api/projects/[projectId]/route.ts"),
    read("drizzle/0029_massive_rictor.sql"),
  ]);

  assert.match(helper, /membershipRole, "co_owner"/);
  assert.match(helper, /eq\(invitations\.status, "pending"\)/);
  assert.match(helper, /gt\(invitations\.expiresAt, new Date\(\)\)/);
  assert.match(responseRoute, /department = "Leadership"/);
  assert.match(responseRoute, /membershipRole: invite\.membershipRole/);
  assert.match(responseRoute, /type: "member_joined"/);
  assert.match(projectRoute, /pendingCoOwners/);
  assert.match(migration, /enforce_project_co_owner_limit/);
  assert.match(migration, /active_count \+ reserved_count >= 2/);
});

test("ordinary invitations retain contributor membership by default", async () => {
  const [schema, route] = await Promise.all([
    read("db/schema.ts"),
    read("app/api/projects/[projectId]/invitations/route.ts"),
  ]);

  assert.match(schema, /membershipRole: text\("membership_role"\)\.notNull\(\)\.default\("contributor"\)/);
  assert.match(route, /membershipRole: "contributor"/);
});

test("co-owner notifications open an explicit invitation response screen", async () => {
  const [page, detailsApi] = await Promise.all([
    read("app/invite/[token]/response.tsx"),
    read("app/api/invitations/[token]/route.ts"),
  ]);

  assert.match(page, /Accept and join/);
  assert.match(page, /respond\("accepted"\)/);
  assert.match(page, /respond\("declined"\)/);
  assert.match(detailsApi, /This invitation belongs to another member/);
  assert.match(detailsApi, /membershipRole === "co_owner" \? "Co-owner"/);
});
