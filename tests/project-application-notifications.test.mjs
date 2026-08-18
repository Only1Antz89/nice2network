import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/projects/[projectId]/route.ts", import.meta.url), "utf8");

test("owners receive project applications with their selected position", () => {
  assert.match(route, /roleTitle:projectRoles\.title/);
  assert.match(route, /pendingApplicationCount:enrichedApplications\.filter/);
  assert.match(page, /<strong>\{application\.roleTitle\}<\/strong>/);
});

test("project notifications tab highlights pending applications in orange", () => {
  assert.match(page, /item === "notifications" && project\.pendingApplicationCount > 0/);
  assert.match(page, /className="project-application-count"/);
  assert.match(page, /tab === "notifications" && project\.isMember/);
  assert.match(page, /canRecruit && \(\s*<div className="project-application-list">/);
});

test("owners clicking a role see filtered applicant fit and profile context", () => {
  assert.match(page, /setSelectedRoleId\(role\.id\);\s*setRoleModalTab\("details"\)/);
  assert.match(page, /roleModalTab === "applicants"/);
  assert.match(page, /application\.roleId === selectedRole\.id/);
  assert.match(page, /application\.fit\.score/);
  assert.match(page, /application\.fit\.mismatch/);
  assert.match(page, /application\.profileBrief/);
  assert.match(page, /application\.applicantSkills/);
  assert.match(page, /application\.applicantLocation/);
  assert.match(page, /application\.applicantInterests/);
  assert.match(route, /fit:applicationFit/);
});
