import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("application notifications always resolve to their specific project", async () => {
  const route = await readFile(new URL("../app/api/notifications/route.ts", import.meta.url), "utf8");

  assert.match(route, /applicationProjectId: applications\.projectId/);
  assert.match(route, /applications\.id\}::text = \$\{notifications\.entityId\}/);
  assert.match(route, /`\/\?view=projects&project=\$\{applicationProjectId\}`/);
  assert.match(route, /item\.entityType === "project"/);
});
