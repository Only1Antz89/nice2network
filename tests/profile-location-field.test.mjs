import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/profiles/[userId]/route.ts", import.meta.url), "utf8");

test("profile settings use one location field", () => {
  assert.match(page, /Location\s*<input\s*value=\{profile\.location\}/);
  assert.doesNotMatch(page, /City\s*<input\s*value=\{profile\.city\}/);
  assert.doesNotMatch(page, /Country\s*<input\s*value=\{profile\.country\}/);
});

test("the profile API accepts and persists the combined location", () => {
  assert.match(route, /location: z\.string\(\)\.trim\(\)\.max\(160\)/);
  assert.match(route, /"interests", "location", "city", "country"/);
});
