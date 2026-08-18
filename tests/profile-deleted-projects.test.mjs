import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("deleted owned and joined projects never appear in profile history", async () => {
  const route = await readFile(
    new URL("../app/api/profiles/[userId]/route.ts", import.meta.url),
    "utf8",
  );

  const deletedFilters = route.match(/ne\(projects\.status,"deleted"\)/g) ?? [];
  assert.equal(deletedFilters.length, 4);
  assert.match(route, /projects:projectHistory/);
});
