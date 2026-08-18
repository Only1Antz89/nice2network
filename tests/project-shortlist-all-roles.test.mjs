import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("owner shortlist includes every unfilled open role", async () => {
  const route = await read("app/api/projects/[projectId]/shortlist/route.ts");

  assert.match(route, /const \[openRoles, rows\] = await Promise\.all/);
  assert.match(route, /eq\(projectRoles\.status, "open"\)/);
  assert.match(route, /projectRoles\.filled} < \$\{projectRoles\.capacity/);
  assert.match(route, /roles: openRoles\.map/);
  assert.match(route, /candidates: perRole\.get\(role\.roleId\) \?\? \[\]/);
});

test("owner shortlist clearly represents roles without a current match", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(page, /Every open position is shown/);
  assert.match(page, /No suitable active match yet/);
  assert.match(page, /No matches yet/);
  assert.match(styles, /\.shortlist-role-empty/);
});
