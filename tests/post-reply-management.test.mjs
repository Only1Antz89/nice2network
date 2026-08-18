import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const threadRoute = await readFile(new URL("../app/api/posts/[postId]/thread/route.ts", import.meta.url), "utf8");
const replyRoute = await readFile(new URL("../app/api/posts/[postId]/thread/[replyId]/route.ts", import.meta.url), "utf8");

test("post conversation header does not repeat the reply count", () => {
  const start = page.indexOf('<span className="eyebrow">POST CONVERSATION</span>');
  const end = page.indexOf('<article className="thread-project thread-post">', start);
  assert.ok(start > -1 && end > start);
  const header = page.slice(start, end);
  assert.doesNotMatch(header, /replyCount|replies\.length|<h2>/);
});

test("reply controls are only rendered for the reply author", () => {
  assert.match(page, /reply\.authorId === currentUserId/);
  assert.match(page, /aria-label="Edit reply"/);
  assert.match(page, /aria-label="Delete reply"/);
  assert.match(page, /<small>Edited<\/small>/);
  assert.match(page, /eyebrow="EDIT REPLY"/);
  assert.match(page, /eyebrow="DELETE REPLY"/);
});

test("reply mutations are authenticated, post-bound and author-only", () => {
  assert.match(replyRoute, /export async function PATCH/);
  assert.match(replyRoute, /export async function DELETE/);
  assert.match(replyRoute, /requireMember\(\)/);
  assert.match(replyRoute, /requirePostView\(memberId, postId\)/);
  assert.match(replyRoute, /eq\(postReplies\.postId, postId\)/);
  assert.match(replyRoute, /reply\.authorId !== memberId/);
  assert.match(replyRoute, /eq\(postReplies\.authorId, member\.id\)/);
  assert.match(replyRoute, /status: "deleted"/);
});

test("thread responses expose edit state without marking new replies edited", () => {
  assert.match(threadRoute, /editedAt:sql<Date\|null>/);
  assert.match(threadRoute, /updatedAt} > \$\{postReplies\.createdAt}/);
  assert.match(threadRoute, /editedAt:null/);
});
