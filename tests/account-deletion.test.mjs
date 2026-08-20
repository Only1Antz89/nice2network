import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("members can permanently delete their account from settings", async () => {
  const [page, route, privacy] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/account/route.ts"),
    read("app/privacy/page.tsx"),
  ]);
  assert.match(page, /Delete account/);
  assert.match(page, /Type DELETE/);
  assert.match(page, /method: "DELETE"/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /z\.literal\("DELETE"\)/);
  assert.match(route, /compare\(input\.password, record\.passwordHash\)/);
  assert.match(route, /status: "deleted"/);
  assert.match(route, /sessionVersion: sql/);
  assert.match(route, /tx\.delete\(accounts\)/);
  assert.match(route, /ownedProjectsArchived: true/);
  assert.match(privacy, /delete your account from Settings under Security and password/);
});
