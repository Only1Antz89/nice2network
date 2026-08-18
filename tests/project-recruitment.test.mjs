import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("project recruitment is restricted to owners and co-owners", async () => {
  const [page, roles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/projects/[projectId]/roles/route.ts"),
  ]);

  assert.match(page, /canRecruit = project\.isOwner/);
  assert.match(page, /professionRequestOpen && canRecruit/);
  assert.match(page, /aiAssistOpen && canRecruit/);
  assert.match(roles, /requireProjectOwner\(member\.id, projectId\)/);
});

test("profession requests and AI project reviews use separate dialogs", async () => {
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
  assert.match(page, /function RequestProfessionDialog/);
  assert.match(page, /function AiAssistDialog/);
  assert.match(page, /profession-request-modal/);
  assert.match(page, /ai-assist-modal/);
  assert.match(page, /setAiAssistOpen\(false\);\s+setProfessionRequestOpen\(true\)/);
  assert.doesNotMatch(page, /className="recruitment-tabs"/);
  assert.match(page, /import N2OrbitMark from "@\/components\/n2-orbit-mark"/);
  assert.doesNotMatch(page, /Sparkles/);
  assert.match(blueprint, /requireProjectOwner/);
  assert.match(blueprint, /generateProjectBlueprint/);
});
