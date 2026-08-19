import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("forward migration safely reads user_id only for project follows", async () => {
  const migration = await read("drizzle/0034_messy_silver_fox.sql");
  assert.match(migration, /CREATE OR REPLACE FUNCTION "prevent_read_only_project_mutation"/);
  assert.match(migration, /TG_TABLE_NAME = 'project_follows'/);
  assert.match(migration, /to_jsonb\(NEW\)->>'user_id'/);
  assert.doesNotMatch(migration, /AND NEW\.user_id/);
  assert.match(migration, /ALTER COLUMN "allow_remote_fallback" SET DEFAULT false/);
});

test("approval persists fallback atomically before recommendations are recomputed", async () => {
  const [route, service, schema, drafts, direct] = await Promise.all([
    read("app/api/projects/[projectId]/blueprint/[blueprintId]/approve/route.ts"),
    read("lib/recommendations/service.ts"),
    read("db/schema.ts"),
    read("app/api/projects/drafts/route.ts"),
    read("app/api/projects/route.ts"),
  ]);
  assert.match(route, /allowRemoteFallback: z\.boolean\(\)\.default\(false\)/);
  assert.match(route, /allowRemoteFallback: input\.allowRemoteFallback/);
  assert.match(service, /db\.transaction/);
  assert.match(service, /allowRemoteFallback: input\.allowRemoteFallback/);
  assert.ok(service.indexOf("allowRemoteFallback: input.allowRemoteFallback") < service.indexOf("recomputeProjectRecommendations(input.projectId)"));
  for (const source of [schema, drafts, direct]) assert.match(source, /allowRemoteFallback:[^\n]*default\(false\)/);
});
