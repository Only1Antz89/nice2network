import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../app/page.tsx");
const css = read("../app/globals.css");
const schema = read("../db/schema.ts");
const projectRoute = read("../app/api/projects/[projectId]/route.ts");
const chatRoute = read("../app/api/projects/[projectId]/chat/route.ts");
const fundingRoute = read("../app/api/projects/[projectId]/funding-interest/route.ts");
const decisionRoute = read("../app/api/applications/[applicationId]/decision/route.ts");
const leaveRoute = read("../app/api/projects/[projectId]/leave/route.ts");

test("project notifications are private to members and applications expand on demand", () => {
  assert.match(page, /item !== "notifications" \|\| project\.isMember/);
  assert.match(page, /tab === "notifications" && project\.isMember/);
  assert.match(page, /expandedApplicationId === application\.id/);
  assert.match(page, /aria-expanded=\{expanded\}/);
  assert.match(css, /\.project-notifications-section\{[^}]*background:var\(--surface\);color:var\(--ink\)/);
});

test("project members can create or join one project-linked chat", () => {
  assert.match(page, /Join chat/);
  assert.match(page, /\/api\/projects\/\$\{projectId\}\/chat/);
  assert.match(chatRoute, /Join this project before entering its chat/);
  assert.match(chatRoute, /eq\(conversations\.projectId, projectId\)/);
  assert.match(chatRoute, /onConflictDoNothing/);
});

test("membership changes create project activity and teammate notifications", () => {
  assert.match(decisionRoute, /type: "member_joined"/);
  assert.match(decisionRoute, /createNotifications/);
  assert.match(leaveRoute, /type:"member_left"/);
  assert.match(leaveRoute, /createNotifications/);
  assert.match(page, /update\.type === "member_joined" \|\| update\.type === "member_left"/);
});

test("application decisions isolate optional side effects from the core membership change", () => {
  assert.match(decisionRoute, /eq\(applications\.status, "pending"\)/);
  assert.match(decisionRoute, /onConflictDoNothing\(\)\.returning/);
  assert.match(decisionRoute, /after\(async \(\) =>/);
  assert.match(decisionRoute, /Promise\.allSettled\(sideEffects\)/);
});

test("funding settings and contribution ledger are persisted with owner controls", () => {
  assert.match(schema, /projectFundingInterests/);
  assert.match(schema, /fundingGoal: integer\("funding_goal"\)/);
  assert.match(schema, /openToInvestment: boolean\("open_to_investment"\)/);
  assert.match(projectRoute, /fundingInterests/);
  assert.match(projectRoute, /shareLimit:z\.number\(\)/);
  assert.match(fundingRoute, /db\.insert\(projectFundingInterests\)/);
  assert.match(fundingRoute, /project\.openToInvestment/);
  assert.match(page, /Only owners and co-owners can change these settings/);
  assert.match(page, /project\.isMember && \(/);
});
