import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("saved library preserves subject context and separates content categories", async () => {
  const [page, route, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/saved-items/route.ts"),
    read("app/globals.css"),
  ]);

  assert.match(page, /Your bookmarks, with their original context/);
  assert.match(page, /\["all", "post", "project", "meeting", "comment"\]/);
  assert.match(page, /function SavedContentCard/);
  assert.match(route, /ownerName:users\.name/);
  assert.match(route, /hostName:users\.name/);
  assert.match(route, /authorName:users\.name/);
  assert.match(route, /href:item\.entityType==="project"/);
  assert.match(styles, /\.saved-content-grid/);
  assert.match(styles, /\.saved-category-tabs/);
});

test("only visible pins lead the profile content with a count-aware layout", async () => {
  const [page, route, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/saved-items/route.ts"),
    read("app/globals.css"),
  ]);

  assert.match(route, /searchParams\.get\("profile"\)/);
  assert.match(route, /isPublicPins\?eq\(savedItems\.pinned,true\)/);
  assert.match(route, /await assertVisible\(member\.id,item\.entityType/);
  assert.ok(page.indexOf('className="profile-pins"') < page.indexOf('className="profile-section bio-section"'));
  assert.match(page, /profilePins\.map\(item => <SavedContentCard/);
  assert.match(page, /profile-pin-grid pin-count-\$\{profilePins\.length\}/);
  assert.match(styles, /profile-pin-grid\.pin-count-1\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(styles, /profile-pin-grid\.pin-count-2\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(styles, /profile-pin-grid\.pin-count-3\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
});

test("admin announcements only lead the feed for their first 24 hours", async () => {
  const route = await read("app/api/posts/route.ts");

  assert.match(route, /announcementCutoff=Date\.now\(\)-24\*60\*60\*1000/);
  assert.match(route, /a\.authorIsAdmin&&new Date\(a\.createdAt\)\.getTime\(\)>=announcementCutoff/);
  assert.match(route, /new Date\(b\.createdAt\)\.getTime\(\)-new Date\(a\.createdAt\)\.getTime\(\)/);
});

test("saved posts and meets open their original destinations", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /onPost=\{openSavedPost\}/);
  assert.match(page, /onMeet=\{openSavedMeet\}/);
  assert.match(page, /params\.get\("post"\)/);
  assert.match(page, /params\.get\("meeting"\)/);
  assert.match(page, /initialMeetingId=\{initialMeetingId\}/);
});
