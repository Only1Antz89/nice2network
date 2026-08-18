import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("signed-in profiles expose likes, watching and repost tabs", async () => {
  const [page, route] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/profiles/[userId]/activity/route.ts"),
  ]);
  assert.match(page, /"likes", "watching", "reposts"/);
  assert.match(page, /\/api\/profiles\/\$\{userId\}\/activity/);
  assert.match(page, /section === "likes" \|\| section === "reposts"/);
  assert.match(page, /section === "watching"/);
  assert.match(route, /getProfileActivity\(userId\)/);
});

test("profile navigation omits the redundant following tab while keeping the count link", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /\["profile", "posts", "projects", "media", "likes", "watching", "reposts"\]/);
  assert.doesNotMatch(page, /\["profile", "projects", "following",/);
  assert.match(page, /onClick=\{\(\) => setSection\("following"\)\}/);
});

test("signed-in profiles show the member's chronological posts", async () => {
  const [page, route] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/profiles/[userId]/route.ts"),
  ]);
  assert.match(page, /section === "posts"/);
  assert.match(page, /profile\?\.posts\?\.map/);
  assert.match(page, /<TimelinePostCard/);
  assert.doesNotMatch(page, /className="profile-post-card"/);
  assert.match(route, /eq\(timelinePosts\.authorId, userId\)/);
  assert.match(route, /orderBy\(desc\(timelinePosts\.createdAt\)\)/);
  assert.match(route, /posts:profilePosts/);
  assert.match(route, /replyCount: sql<number>/);
  assert.match(route, /linkedProjects: post\.linkedProjectIds/);
});

test("public profiles expose the same activity tabs and only visible network content", async () => {
  const [page, activity] = await Promise.all([
    read("app/[username]/page.tsx"),
    read("lib/profile-activity.ts"),
  ]);
  for (const tab of ["likes", "watching", "reposts"]) {
    assert.match(page, new RegExp(`tab=${tab}`));
  }
  assert.match(activity, /eq\(timelinePosts\.status, "visible"\)/);
  assert.match(activity, /eq\(timelinePosts\.visibility, "network"\)/);
  assert.match(activity, /eq\(projects\.status, "active"\)/);
  assert.match(activity, /eq\(projects\.visibility, "network"\)/);
});
