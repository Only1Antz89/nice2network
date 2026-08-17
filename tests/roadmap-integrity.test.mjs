import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("roadmap reordering swaps with the nearest adjacent step", async () => {
  const route = await read("app/api/milestones/[milestoneId]/route.ts");

  assert.match(route, /movingUp\?desc\(milestones\.sortOrder\):asc\(milestones\.sortOrder\)/);
  assert.match(route, /eq\(milestones\.status,"planned"\),direction/);
  assert.doesNotMatch(route, /move_up"\?asc\(milestones\.sortOrder\)/);
});

test("edited project updates cannot reference another project's roadmap", async () => {
  const route = await read("app/api/project-updates/[updateId]/route.ts");

  assert.match(route, /eq\(milestones\.projectId,row\.update\.projectId\)/);
  assert.match(route, /Choose a roadmap step from this project/);
});

test("roadmap owners must be members of the same project", async () => {
  const [createRoute, editRoute] = await Promise.all([
    read("app/api/projects/[projectId]/milestones/route.ts"),
    read("app/api/milestones/[milestoneId]/route.ts"),
  ]);

  for (const route of [createRoute, editRoute]) {
    assert.match(route, /eq\(projectMembers\.userId,input\.ownerId\)/);
    assert.match(route, /Choose a member of this project as the roadmap owner/);
  }
});

test("concurrent roadmap creation serializes sort position allocation", async () => {
  const route = await read("app/api/projects/[projectId]/milestones/route.ts");

  assert.match(route, /pg_advisory_xact_lock\(hashtext\(/);
  assert.match(route, /tx\.select\(\{value:max\(milestones\.sortOrder\)\}\)/);
  assert.match(route, /tx\.insert\(milestones\)/);
});
