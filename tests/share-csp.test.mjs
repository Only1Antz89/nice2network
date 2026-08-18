import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("social share controls use CSP-safe local brand icons", async () => {
  const [styles, shareSheet] = await Promise.all([
    read("components/share-sheet.module.css"),
    read("components/share-sheet.tsx"),
  ]);
  assert.match(styles, /\.socialShare a::before[\s\S]*?display: none !important;[\s\S]*?background-image: none !important/);
  assert.match(styles, /\.brandIcon svg[\s\S]*?display: block;[\s\S]*?fill: currentColor/);
  assert.match(styles, /\.whatsapp \{ background: #25d366/);
  assert.match(styles, /\.linkedin \{ background: #0a66c2/);
  assert.match(shareSheet, /shareStyles\.socialShare/);
  assert.match(shareSheet, /onClick=\{\(\) => track\("whatsapp"\)\}/);
  assert.match(shareSheet, /onClick=\{\(\) => track\("linkedin"\)\}/);
});
