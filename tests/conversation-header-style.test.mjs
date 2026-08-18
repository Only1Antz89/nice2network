import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("conversation status uses the primary text colour", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.conversation-identity small\{font-size:9px;color:var\(--ink\)\}/);
});

test("conversation titles use the correct brand colours", async () => {
  const styles = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const page = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(styles, /\.conversation-title--project\{color:var\(--orange\)\}/);
  assert.match(styles, /\.conversation-title--direct\{color:var\(--green\)\}/);
  assert.match(page, /row\.projectId\s*\?\s*"conversation-title--project"/);
  assert.match(page, /row\.members\.length <= 2\s*\?\s*"conversation-title--direct"/);
  assert.equal((page.match(/className=\{conversationTitleClass\(/g) ?? []).length, 2);
});
