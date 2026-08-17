import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("social share controls use CSP-safe inline icons", async () => {
  const [styles, shareSheet] = await Promise.all([
    read("components/share-sheet.module.css"),
    read("components/share-sheet.tsx"),
  ]);
  assert.match(styles, /\.socialShare a::before[\s\S]*?display: none !important;[\s\S]*?background-image: none !important/);
  assert.match(styles, /\.socialShare a svg[\s\S]*?display: block;[\s\S]*?background: var\(--ink\)/);
  assert.match(shareSheet, /shareStyles\.socialShare/);
  assert.match(shareSheet, /onClick=\{\(\) => track\("whatsapp"\)\}/);
  assert.match(shareSheet, /onClick=\{\(\) => track\("linkedin"\)\}/);
});
