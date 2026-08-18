import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const applyRoute = readFileSync(
  new URL("../app/api/projects/[projectId]/apply/route.ts", import.meta.url),
  "utf8",
);

test("project owners and members cannot activate vacancy application controls", () => {
  assert.match(page, /disabled=\{Boolean\(project\.isOwner \|\| project\.isMember\)\}/);
  assert.match(page, /canApplyToProject = !project\.isOwner && !project\.isMember/);
  assert.match(page, /disabled=\{!canApplyToProject && !project\.isOwner\}/);
  assert.match(page, /if \(project\.isOwner\) \{\s*setSelectedApplicationRoleId\(role\.id\);/);
});

test("direct role links do not open an application for owners or members", () => {
  assert.match(page, /if \(data\.project\.isOwner \|\| data\.project\.isMember\) return;/);
});

test("the application endpoint retains its owner-side safeguard", () => {
  assert.match(applyRoute, /if\(role\.ownerId===member\.id\)throw new ApiError\(409,"You already own this project"\)/);
});
