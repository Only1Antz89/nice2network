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
