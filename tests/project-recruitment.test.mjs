import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("project recruitment is owner-only on both the client and server", async () => {
  const [page, roles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/projects/[projectId]/roles/route.ts"),
  ]);

  assert.match(page, /canRecruit = project\.ownerId === project\.currentUserId/);
  assert.match(page, /recruitmentOpen && canRecruit/);
  assert.match(roles, /eq\(projects\.ownerId, member\.id\)/);
  assert.match(roles, /Only a project owner can add roles/);
});

test("owners can choose manual profession recruitment or an AI project review", async () => {
  const [page, blueprint] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/projects/[projectId]/blueprint/route.ts"),
  ]);

  for (const copy of [
    "Request a profession",
    "Ai Assist",
    "Start Ai Assist",
    "Review this project",
    "Recommended next steps",
    "Request this role",
  ]) assert.match(page, new RegExp(copy));
  assert.match(page, /fetch\(`\/api\/projects\/\$\{project\.id\}\/roles`/);
  assert.match(page, /fetch\(`\/api\/projects\/\$\{project\.id\}\/blueprint`/);
  assert.match(page, /import N2OrbitMark from "@\/components\/n2-orbit-mark"/);
  assert.doesNotMatch(page, /Sparkles/);
  assert.match(blueprint, /requireProjectOwner/);
  assert.match(blueprint, /generateProjectBlueprint/);
});
