import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/page.tsx");
const styles = read("app/globals.css");
const projectRoute = read("app/api/projects/[projectId]/route.ts");
const roleRoute = read("app/api/projects/[projectId]/roles/[roleId]/route.ts");
const involvementRoute = read("app/api/projects/[projectId]/involvement/[requestId]/route.ts");

test("each open role exposes its own total and pending application counts", () => {
  assert.match(projectRoute, /applicationCounts=new Map/);
  assert.match(projectRoute, /applicationCount:applicationCounts\.get\(role\.id\)\?\.all\?\?0/);
  assert.match(projectRoute, /pendingApplicationCount:applicationCounts\.get\(role\.id\)\?\.pending\?\?0/);
  assert.match(page, /className="detail-role-title"/);
  assert.match(page, /\(role\.applicationCount \?\? 0\) > 0/);
  assert.match(page, /aria-label=\{`\$\{role\.applicationCount\} applications`\}/);
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

test("the role applicant tab shows fit, context, mismatch and a clickable applicant name", () => {
  const applicantListStart = page.indexOf('<div className="role-applicant-list">');
  const applicantList = page.slice(applicantListStart, page.indexOf("!project.applications.some", applicantListStart));
  assert.match(page, /Applicants <b>\{selectedRole\.applicationCount \?\? 0\}<\/b>/);
  assert.match(applicantList, /className="application-person" onClick=\{\(\) => onProfile\(application\.applicantId\)\}/);
  assert.doesNotMatch(applicantList, /View full profile/);
  assert.match(applicantList, /data-fit-tier=\{application\.fit\.score >= 80 \? "high" : application\.fit\.score <= 50 \? "low" : "medium"\}/);
  assert.match(applicantList, /--role-fit-progress/);
  assert.match(styles, /conic-gradient\(currentColor var\(--role-fit-progress\),var\(--line\) 0\)/);
  assert.match(styles, /application-fit\[data-fit-tier="low"\]\{color:var\(--ink\)\}/);
  assert.match(styles, /application-fit\[data-fit-tier="high"\]\{color:var\(--green\)\}/);
  assert.match(page, /application\.fit\.mismatch/);
  assert.match(page, /Applied outside role match/);
  assert.match(page, /application\.applicantSkills/);
  assert.match(page, /application\.applicantInterests/);
  assert.match(page, /REASON FOR JOINING/);
  assert.match(applicantList, /<footer><span className=\{`application-status \$\{application\.status\}`\}>\{application\.status\}<\/span>/);
  assert.match(styles, /role-applicant-list article>footer>button,\.project-notifications-section \.application-review-actions>button\{width:110px;height:40px/);
});

test("project notifications reuse the open contribution role-fit meter", () => {
  const notificationsStart = page.indexOf('<section className="project-notifications-section">');
  const notifications = page.slice(notificationsStart, page.indexOf('tab === "ai"', notificationsStart));
  assert.match(notifications, /data-fit-tier=\{application\.fit\.score >= 80 \? "high" : application\.fit\.score <= 50 \? "low" : "medium"\}/);
  assert.match(notifications, /role="meter"/);
  assert.match(notifications, /aria-valuenow=\{application\.fit\.score\}/);
  assert.match(notifications, /--role-fit-progress/);
  assert.match(notifications, /<small>role fit<\/small>/);
  assert.match(styles, /\.application-fit\[data-fit-tier\]\{--role-fit-progress:0%;/);
  assert.match(notifications, /<span className=\{`application-status \$\{application\.status\}`\}>\{application\.status\}<\/span>/);
  assert.match(styles, /project-notifications-section \.application-review-actions>\.application-status\{margin-left:0;margin-right:auto\}/);
  assert.match(styles, /project-notifications-section \.application-review-actions>button\{width:110px;height:40px;justify-content:center;padding:0 14px\}/);
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
