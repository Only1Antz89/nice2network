import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("members can deactivate, reactivate, and separately schedule permanent account deletion", async () => {
  const [page, route, deactivateRoute, reactivationRoute, lifecycle, privacy, vercel, styles, darkStyles, signin] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/account/route.ts"),
    read("app/api/account/deactivate/route.ts"),
    read("app/api/account/reactivate/route.ts"),
    read("lib/account-lifecycle.ts"),
    read("app/privacy/page.tsx"),
    read("vercel.json"),
    read("app/globals.css"),
    read("app/dark-theme.css"),
    read("app/signin/page.tsx"),
  ]);
  assert.match(page, /Delete account/);
  assert.match(page, /Type DELETE/);
  assert.match(page, /method: "DELETE"/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /z\.literal\("DELETE"\)/);
  assert.match(route, /consequencesAccepted: z\.literal\(true\)/);
  assert.match(route, /compare\(input\.password, record\.passwordHash\)/);
  assert.match(route, /initiateAccountDeletion/);
  assert.match(deactivateRoute, /initiateAccountDeactivation/);
  assert.match(lifecycle, /status: "deactivated"/);
  assert.match(lifecycle, /status: "deleted"/);
  assert.match(lifecycle, /ACCOUNT_DEACTIVATION_MONTHS = 3/);
  assert.match(lifecycle, /setUTCMonth\(result\.getUTCMonth\(\) \+ months\)/);
  assert.match(lifecycle, /ACCOUNT_DELETION_RECOVERY_MS = 30 \* 24/);
  assert.match(reactivationRoute, /export async function POST/);
  assert.match(reactivationRoute, /deletionRequestedAt: null/);
  assert.match(signin, /account_deactivated/);
  assert.match(signin, />Need help\?</);
  assert.match(privacy, /three months/);
  assert.match(vercel, /"path": "\/api\/cron\/account-transitions", "schedule": "0 4 \* \* \*"/);
  assert.match(styles, /\.account-danger-zone\{[^}]*background:#11110f;color:#fff/);
  assert.match(styles, /\.account-danger-zone \.secondary-button\{[^}]*background:#c8322b;color:#fff/);
  assert.match(darkStyles, /\.account-danger-zone\{background:#11110f;border-color:#fff;color:#fff\}/);
});
