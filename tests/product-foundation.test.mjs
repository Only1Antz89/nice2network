import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("defines durable product records and safety controls", async () => {
  const schema = await read("db/schema.ts");
  for (const table of ["users", "projects", "projectRoles", "applications", "invitations", "milestones", "projectUpdates", "integrationAccounts", "meetings", "reports", "blocks", "privacySettings", "matchFeedback", "auditLog"]) {
    assert.match(schema, new RegExp(`export const ${table} = pgTable`));
  }
});

test("ships secured feature routes", async () => {
  const [projects, calendar, reports, feedback] = await Promise.all([
    read("app/api/projects/route.ts"),
    read("app/api/calendar/events/route.ts"),
    read("app/api/moderation/reports/route.ts"),
    read("app/api/matches/feedback/route.ts"),
  ]);
  for (const route of [projects, calendar, reports, feedback]) assert.match(route, /requireMember\(\)/);
  assert.match(calendar, /graph\.microsoft\.com/);
  assert.match(calendar, /googleapis\.com/);
});

test("includes a deployable PostgreSQL migration", async () => {
  const migration = await read("drizzle/0000_late_major_mapleleaf.sql");
  assert.match(migration, /CREATE TABLE "users"/);
  assert.match(migration, /CREATE TABLE "match_feedback"/);
  assert.match(migration, /CREATE TABLE "reports"/);
});

test("requires verified email before professional onboarding", async () => {
  const [register, verify, onboarding, credentials] = await Promise.all([
    read("app/api/auth/register/route.ts"),
    read("app/api/auth/verify/route.ts"),
    read("app/api/auth/onboarding/route.ts"),
    read("auth.ts"),
  ]);
  assert.match(register, /pending_verification/);
  assert.match(register, /sendVerificationEmail/);
  assert.match(verify, /emailVerified/);
  assert.match(verify, /n2_onboarding/);
  assert.match(onboarding, /onboardingCompletedAt/);
  assert.match(credentials, /member\.status !== "active"/);
});

test("supports authenticated password changes and private reset links", async () => {
  const [change, forgot, reset] = await Promise.all([
    read("app/api/auth/password/change/route.ts"),
    read("app/api/auth/password/forgot/route.ts"),
    read("app/api/auth/password/reset/route.ts"),
  ]);
  assert.match(change, /requireMember\(\)/);
  assert.match(change, /compare\(input\.currentPassword/);
  assert.match(forgot, /If that account exists/);
  assert.match(forgot, /30 \* 60 \* 1000/);
  assert.match(reset, /verificationTokens\.expires/);
  assert.match(reset, /delete\(sessions\)/);
});

test("protects administrator access and the public n2 identity", async () => {
  const [permissions, auth, adminPage, migration, profile] = await Promise.all([
    read("lib/admin.ts"), read("auth.ts"), read("app/admin/page.tsx"),
    read("drizzle/0002_pink_earthquake.sql"), read("app/page.tsx"),
  ]);
  assert.match(permissions, /requirePermission/);
  assert.match(permissions, /recentlyVerified/);
  assert.match(auth, /isN2Admin/);
  assert.match(adminPage, /recentlyVerified/);
  assert.match(migration, /audit_log_immutable/);
  assert.match(profile, /N2AdminBadge/);
  assert.match(profile, /nice-2-network-mark\.svg/);
});

test("enforces protected teen contact and privacy-aware matching", async () => {
  const [registration, conversation, invitations, meetings, matching] = await Promise.all([
    read("app/api/auth/register/route.ts"), read("app/api/conversations/route.ts"),
    read("app/api/projects/[projectId]/invitations/route.ts"), read("app/api/calendar/events/route.ts"),
    read("app/api/matches/score/route.ts"),
  ]);
  assert.match(registration, /teen_16_17/);
  assert.match(conversation, /adult_teen_contact_blocked/);
  assert.match(invitations, /adult_teen_invitation_blocked/);
  assert.match(meetings, /group.*at least three/i);
  assert.match(matching, /feedbackAffinity:undefined/);
});

test("limits raw analytics retention and excludes direct identifiers", async () => {
  const [analytics, cron] = await Promise.all([read("lib/analytics.ts"), read("app/api/cron/analytics/route.ts")]);
  assert.doesNotMatch(analytics, /messageBody|dateOfBirth|verificationToken|resetToken/);
  assert.match(analytics, /actorHash/);
  assert.match(cron, /- 90/);
  assert.match(cron, /delete\(productEvents\)/);
});

test("ships durable notifications, search, projects and sharing", async () => {
  const [schema, notifications, search, projects, eyes, page] = await Promise.all([
    read("db/schema.ts"), read("app/api/notifications/route.ts"), read("app/api/search/route.ts"),
    read("app/api/projects/route.ts"), read("app/api/projects/[projectId]/eyes/route.ts"), read("app/page.tsx"),
  ]);
  for (const table of ["notifications", "notificationPreferences", "projectEyes"]) assert.match(schema, new RegExp(`export const ${table} = pgTable`));
  assert.match(notifications, /read_all/);
  assert.match(notifications, /preferences/);
  assert.match(search, /privacySettings/);
  assert.match(search, /projectRoles/);
  assert.match(projects, /scope === "mine"/);
  assert.match(eyes, /project_eye_added/);
  assert.match(page, /ShareSheet/);
  assert.match(page, /WhatsApp/);
  assert.match(page, /LinkedIn/);
});
