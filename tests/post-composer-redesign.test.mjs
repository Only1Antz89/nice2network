import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("post composer uses the compact message-style dock and 1000 character limit", async () => {
  const [page, styles, createRoute, updateRoute, drafts] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
    read("app/api/posts/route.ts"),
    read("app/api/posts/[postId]/route.ts"),
    read("lib/content-drafts.ts"),
  ]);

  assert.match(page, /className="post-composer-dock"/);
  assert.match(page, /aria-label="Add to post"/);
  assert.match(page, /className="post-attachment-menu"/);
  assert.match(page, /className="post-circle-button post-submit-button"/);
  assert.match(page, /maxLength=\{1000\}/);
  assert.match(page, /body\.length\}\/1000/);
  assert.match(styles, /conic-gradient\(#11110f var\(--post-character-fill\),#d4d4cf 0\)/);
  assert.match(createRoute, /body: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(1000\)/);
  assert.match(updateRoute, /body: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(1000\)\.optional\(\)/);
  assert.match(drafts, /body: z\.string\(\)\.max\(3000\)/);
});

test("post tagging supports keyboard-accessible people and project autocomplete", async () => {
  const [page, styles, search, mentions] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
    read("app/api/search/route.ts"),
    read("lib/mentions.ts"),
  ]);

  assert.match(page, /function activePostTagAtCursor/);
  assert.match(page, /\(\[@#\]\)/);
  assert.match(page, /function replaceActivePostTag/);
  assert.match(page, /event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"/);
  assert.match(page, /event\.key === "Enter" \|\| event\.key === "Tab"/);
  assert.match(page, /scope=mentions/);
  assert.match(page, /Type at least two characters to search the network/);
  assert.match(page, /linked\.length >= 8/);
  assert.match(page, /className="person"/);
  assert.match(page, /className="project"/);
  assert.match(styles, /\.post-selected-tags button\.person/);
  assert.match(styles, /\.post-selected-tags button\.project/);
  assert.match(styles, /\.post-project-links button\{[^}]*var\(--orange\)/);
  assert.match(search, /scope === "mentions"/);
  assert.match(search, /isFollowing.*followsViewer.*sharesProject/);
  assert.match(mentions, /discoverableById/);
  assert.match(mentions, /privacySettings\.profileVisibility/);
  assert.match(mentions, /discoverableAgeBands/);
});
