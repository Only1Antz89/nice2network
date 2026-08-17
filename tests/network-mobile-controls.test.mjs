import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/page.tsx", import.meta.url);
const stylesPath = new URL("../app/network.css", import.meta.url);

test("the network owner avatar is an icon-only search control", async () => {
  const source = await readFile(pagePath, "utf8");
  const start = source.indexOf('className="network-node network-self network-self-search"');
  const end = source.indexOf("{focusNode &&", start);
  const ownerControl = source.slice(start, end);

  assert.match(ownerControl, /<Avatar/);
  assert.match(ownerControl, /network-self-search-icon/);
  assert.doesNotMatch(ownerControl, /<span>\{currentMember\.name\}<\/span>/);
  assert.doesNotMatch(ownerControl, /Search your network<\/small>/);
});

test("mobile network controls remain visible without overlapping labels", async () => {
  const css = await readFile(stylesPath, "utf8");

  assert.match(css, /\.network-self-search:hover \.avatar/);
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /\.network-display-popover\{position:absolute;right:0;top:auto;bottom:calc\(100% \+ 8px\)/);
  assert.match(css, /@media\(hover:none\) and \(pointer:coarse\)/);
});
