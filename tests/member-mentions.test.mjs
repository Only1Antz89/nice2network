import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const search = readFileSync(new URL("../app/api/search/route.ts", import.meta.url), "utf8");
const posts = readFileSync(new URL("../app/api/posts/route.ts", import.meta.url), "utf8");
const replies = readFileSync(new URL("../app/api/posts/[postId]/thread/route.ts", import.meta.url), "utf8");
const messages = readFileSync(new URL("../app/api/conversations/[conversationId]/messages/route.ts", import.meta.url), "utf8");

test("post and group-message composers expose the member mention picker", () => {
  assert.match(page, /function MentionPicker/);
  assert.match(page, /aria-label="Tag a member"/);
  assert.match(page, /selected\.members\.length > 2/);
  assert.match(page, /insertMentionAtCursor\(draft, person\.username/);
});

test("member search returns and matches usernames", () => {
  assert.match(search, /username: users\.username/);
  assert.match(search, /ilike\(users\.username, term\)/);
});

test("mentions notify tagged members in posts, replies, and group messages", () => {
  assert.match(posts, /tagged you in a post/);
  assert.match(replies, /tagged you in a reply/);
  assert.match(messages, /tagged you in a group message/);
});
