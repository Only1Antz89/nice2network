import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("profile settings save only fields the member changed", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /persistedProfileRef/);
  assert.match(page, /const updates: Record<string, unknown> = \{\}/);
  assert.match(page, /method: "PATCH"/);
  assert.match(page, /skillsChanged/);
  assert.match(page, /updates\.primarySkill = profile\.primarySkill/);
  assert.match(page, /JSON\.stringify\(profile\.career\) !== JSON\.stringify/);
  assert.match(page, /JSON\.stringify\(profile\.education\) !== JSON\.stringify/);
});

test("partial profile updates do not replace untouched history sections", async () => {
  const route = await read("app/api/profiles/[userId]/route.ts");
  assert.match(route, /const profilePatchSchema = profileSchema\.partial\(\)/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /if \(input\.career !== undefined\)/);
  assert.match(route, /if \(input\.education !== undefined\)/);
  assert.match(route, /if \(input\.primarySkill !== undefined \|\| input\.secondarySkill !== undefined \|\| input\.tertiarySkill !== undefined\)/);
});
