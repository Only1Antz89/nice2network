import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/page.tsx");
const projectRoute = read("app/api/projects/[projectId]/route.ts");
const roleRoute = read("app/api/projects/[projectId]/roles/[roleId]/route.ts");
const involvementRoute = read("app/api/projects/[projectId]/involvement/[requestId]/route.ts");

test("each open role exposes its own total and pending application counts", () => {
  assert.match(projectRoute, /applicationCounts=new Map/);
  assert.match(projectRoute, /applicationCount:applicationCounts\.get\(role\.id\)\?\.all\?\?0/);
  assert.match(projectRoute, /pendingApplicationCount:applicationCounts\.get\(role\.id\)\?\.pending\?\?0/);
  assert.match(page, /aria-label=\{`\$\{role\.applicationCount \?\? 0\} applications`\}/);
  assert.match(page, /className="role-application-badge"/);
});

test("owners and co-owners can edit or remove only roles belonging to their project", () => {
  assert.match(roleRoute, /requireProjectOwner\(member\.id, projectId\)/);
  assert.match(roleRoute, /eq\(projectRoles\.id, roleId\), eq\(projectRoles\.projectId, projectId\)/);
  assert.match(roleRoute, /export async function PATCH/);
  assert.match(roleRoute, /export async function DELETE/);
  assert.match(roleRoute, /status: "removed"/);
  assert.match(page, /Role details/);
  assert.match(page, /REMOVE ROLE/);
});

test("the role applicant tab shows fit, context, mismatch and profile actions", () => {
  assert.match(page, /Applicants <b>\{selectedRole\.applicationCount \?\? 0\}<\/b>/);
  assert.match(page, /application\.fit\.score/);
  assert.match(page, /application\.fit\.mismatch/);
  assert.match(page, /Applied outside role match/);
  assert.match(page, /application\.applicantSkills/);
  assert.match(page, /application\.applicantInterests/);
  assert.match(page, /REASON FOR JOINING/);
  assert.match(page, /View full profile/);
});

test("general involvement offers stay private to owners and support early onboarding", () => {
  assert.match(projectRoute, /isOwner\s*\? db\.select\(\{id:projectInvolvementRequests\.id/);
  assert.match(page, /OTHER WAYS TO GET INVOLVED/);
  assert.match(page, /Offers beyond the listed roles/);
  assert.match(page, /Onboard early/);
  assert.match(involvementRoute, /requireProjectOwner\(member\.id, projectId\)/);
  assert.match(involvementRoute, /tx\.insert\(projectMembers\)/);
  assert.match(involvementRoute, /roleId: input\.roleId/);
  assert.match(involvementRoute, /if \(input\.roadmapTitle\)/);
  assert.match(involvementRoute, /tx\.insert\(milestones\)/);
});
