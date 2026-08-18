import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const search = readFileSync(new URL("../app/api/search/route.ts", import.meta.url), "utf8");
const posts = readFileSync(new URL("../app/api/posts/route.ts", import.meta.url), "utf8");
const replies = readFileSync(new URL("../app/api/posts/[postId]/thread/route.ts", import.meta.url), "utf8");
const messages = readFileSync(new URL("../app/api/conversations/[conversationId]/messages/route.ts", import.meta.url), "utf8");

test("typing @ opens connected-profile suggestions without a tag button", () => {
  assert.match(page, /function MentionSuggestions/);
  assert.match(page, /activeMentionAtCursor/);
  assert.match(page, /scope=connections/);
  assert.match(page, /selected\.members\.length > 2/);
  assert.match(page, /replaceActiveMention/);
  assert.match(page, /className="comment-composer post-reply-composer project-comment-composer"[\s\S]*?<MentionSuggestions/);
  assert.doesNotMatch(page, /aria-label="Tag a member"/);
  assert.doesNotMatch(page, /<MentionPicker/);
});

test("member search returns and matches usernames", () => {
  assert.match(search, /username: users\.username/);
  assert.match(search, /ilike\(users\.username, term\)/);
  assert.match(search, /scope"\) === "connections"/);
  assert.match(search, /connectionsOnly \? and\(isFollowing, followsViewer\)/);
});

test("mentions notify tagged members in posts, replies, and group messages", () => {
  assert.match(posts, /tagged you in a post/);
  assert.match(replies, /tagged you in a reply/);
  assert.match(messages, /tagged you in a group message/);
});
