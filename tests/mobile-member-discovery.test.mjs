import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const search = readFileSync(new URL("../components/search-overlay.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("mobile feed uses member discovery instead of project creation", () => {
  assert.match(page, /className="primary-button feed-create-project"/);
  assert.match(page, /className="primary-button feed-mobile-discovery"[\s\S]*?onDiscover/);
  assert.match(page, /onDiscover=\{\(\) => setSearchOpen\(true\)\}/);
  assert.match(css, /@media\(max-width:700px\)[\s\S]*?\.feed-create-project\{display:none\}/);
});

test("mobile search includes people to know and member actions", () => {
  assert.match(search, /id="mobile-people-to-know"[\s\S]*?PEOPLE TO KNOW/);
  assert.match(search, /suggestions\.slice\(0, 3\)/);
  assert.match(search, /onFollowSuggestion/);
  assert.match(search, /expandable=\{false\}/);
  assert.match(css, /\.mobile-search-people\{display:block/);
});
