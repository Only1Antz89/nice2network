import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appPage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const publicProfile = readFileSync(new URL("../app/[username]/page.tsx", import.meta.url), "utf8");

test("in-app profile project titles open project detail", () => {
  assert.match(appPage, /onClick=\{\(\) => onProject\(project\.id\)\}/);
  assert.match(appPage, /onProject=\{openProject\}/);
  assert.match(appPage, /setSelectedProjectId\(projectId\);\s*setView\("projects"\);/);
});

test("public profile project titles link to project detail", () => {
  assert.match(publicProfile, /href=\{`\/\?view=projects&project=\$\{project\.id\}`\}/);
});
