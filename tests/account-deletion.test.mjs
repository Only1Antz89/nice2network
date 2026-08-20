import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("members can deactivate, recover, and schedule permanent account deletion", async () => {
  const [page, route, recoveryRoute, lifecycle, privacy] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/account/route.ts"),
    read("app/api/account/recover/route.ts"),
    read("lib/account-lifecycle.ts"),
    read("app/privacy/page.tsx"),
  ]);
  assert.match(page, /Delete account/);
  assert.match(page, /Type DELETE/);
  assert.match(page, /method: "DELETE"/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /z\.literal\("DELETE"\)/);
  assert.match(route, /consequencesAccepted: z\.literal\(true\)/);
  assert.match(route, /compare\(input\.password, record\.passwordHash\)/);
  assert.match(route, /initiateAccountDeactivation/);
  assert.match(lifecycle, /status: "deactivated"/);
  assert.match(lifecycle, /status: "deleted"/);
  assert.match(lifecycle, /ACCOUNT_RECOVERY_MS = 30 \* 24/);
  assert.match(recoveryRoute, /export async function POST/);
  assert.match(recoveryRoute, /status: "active"/);
  assert.match(privacy, /30 days to recover/);
});
