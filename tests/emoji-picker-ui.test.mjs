import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentPath = new URL("../components/emoji-picker.tsx", import.meta.url);
const stylesPath = new URL("../components/emoji-picker.module.css", import.meta.url);

test("emoji picker uses visible inline category icons", async () => {
  const source = await readFile(componentPath, "utf8");

  assert.match(source, /categoryIcons=\{categoryIcons\}/);
  assert.match(source, /\[Categories\.SMILEYS_PEOPLE\]: <Smile/);
  assert.match(source, /\[Categories\.FLAGS\]: <Flag/);
  assert.match(source, /theme=\{Theme\.AUTO\}/);
});

test("emoji search and trigger keep neutral focus and dark-mode contrast", async () => {
  const css = await readFile(stylesPath, "utf8");

  assert.match(css, /\.epr-search-container input:focus/);
  assert.match(css, /box-shadow: none !important/);
  assert.match(css, /padding: 0 42px !important/);
  assert.match(css, /\.epr-icn-search/);
  assert.match(css, /left: 14px !important/);
  assert.match(css, /html\[data-colour-theme="dark"\]/);
});
