import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("project creation uses a simple generic title prompt", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /placeholder="What will your project be called\?"/);
  assert.doesNotMatch(source, /placeholder="Repair, remake, pass it on"/);
});
