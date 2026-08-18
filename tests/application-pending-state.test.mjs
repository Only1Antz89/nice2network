import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("pending applications show a clear, non-actionable review state", async () => {
  const [page, styles, darkStyles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/dark-theme.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /You’ve already applied/);
  assert.match(page, /The project lead will review it and let you know their decision/);
  assert.match(page, /\(role \|\| generic\) && !blocked/);
  assert.match(styles, /\.role-fit\.application-pending\{border:1px solid #b9e5cf/);
  assert.match(darkStyles, /\.role-fit\.application-pending \{[\s\S]*?background: #123d2d;[\s\S]*?color: #effff7;/);
});
